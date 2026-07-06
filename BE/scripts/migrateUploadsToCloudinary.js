/**
 * Đẩy toàn bộ ảnh/file đang lưu trên đĩa (BE/uploads/**) lên Cloudinary
 * rồi cập nhật DB để trỏ về URL Cloudinary. Dùng để cứu dữ liệu cũ khi
 * chuyển host sang môi trường filesystem ephemeral (Render/Vercel...).
 *
 * Chạy:  node scripts/migrateUploadsToCloudinary.js
 * An toàn để chạy lại nhiều lần (idempotent): file nào đã trỏ URL http thì bỏ qua.
 */
require('dotenv').config();
// Một số DNS nội bộ chặn bản ghi SRV của mongodb+srv → dùng DNS công cộng.
try {
  require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch { /* ignore */ }
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { isCloudinaryConfigured, uploadDataUri } = require('../src/utils/cloudinary');

const UPLOADS = path.join(__dirname, '../uploads');

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const toDataUri = (filePath) => {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const b64 = fs.readFileSync(filePath).toString('base64');
  return { dataUri: `data:${mime};base64,${b64}`, ext };
};

const listFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f !== '.gitkeep');
};

const run = async () => {
  if (!isCloudinaryConfigured()) {
    console.error('Cloudinary chưa cấu hình (thiếu CLOUDINARY_* trong .env). Dừng.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Đã kết nối MongoDB.\n');

  const Event = require('../src/models/Event');
  const EventProposal = require('../src/models/EventProposal');
  const Announcement = require('../src/models/Announcement');
  const User = require('../src/models/User');
  const Club = require('../src/models/Club');
  const Partner = require('../src/models/Partner');
  const ClubSemesterTimeline = require('../src/models/ClubSemesterTimeline');

  let uploaded = 0;
  let skipped = 0;

  const migrateSimple = async ({ label, dir, folder, resourceType = 'image', apply }) => {
    for (const file of listFiles(dir)) {
      const id = path.basename(file, path.extname(file));
      const filePath = path.join(dir, file);
      const { dataUri } = toDataUri(filePath);
      try {
        const res = await uploadDataUri(dataUri, { folder, publicId: id, resourceType });
        if (!res?.url) { skipped += 1; continue; }
        const changed = await apply(id, res.url);
        if (changed) { uploaded += 1; console.log(`[${label}] ${id} -> ${res.url}`); }
        else { skipped += 1; console.log(`[${label}] ${id} (không tìm thấy bản ghi, bỏ qua)`); }
      } catch (e) {
        skipped += 1;
        console.warn(`[${label}] ${id} LỖI:`, e.message);
      }
    }
  };

  // 1) Event covers
  await migrateSimple({
    label: 'event-cover', dir: path.join(UPLOADS, 'event-covers'),
    folder: 'fevents/event-covers',
    apply: async (id, url) => {
      const r = await Event.updateOne({ _id: id }, { $set: { thumbnail: url, image: url, coverFileExt: '' } });
      return r.matchedCount > 0;
    },
  });

  // 2) Announcement images
  await migrateSimple({
    label: 'announcement', dir: path.join(UPLOADS, 'announcement-images'),
    folder: 'fevents/announcement-images',
    apply: async (id, url) => {
      const r = await Announcement.updateOne({ _id: id }, { $set: { image: url, imageFileExt: '' } });
      return r.matchedCount > 0;
    },
  });

  // 3) User avatars
  await migrateSimple({
    label: 'user-avatar', dir: path.join(UPLOADS, 'user-avatars'),
    folder: 'fevents/user-avatars',
    apply: async (id, url) => {
      const r = await User.updateOne({ _id: id }, { $set: { picture: url, avatar: url, avatarFileExt: '' } });
      return r.matchedCount > 0;
    },
  });

  // 4) Partner logos
  await migrateSimple({
    label: 'partner-logo', dir: path.join(UPLOADS, 'partner-logos'),
    folder: 'fevents/partner-logos',
    apply: async (id, url) => {
      const r = await Partner.updateOne({ _id: id }, { $set: { logo: url, logoFileExt: '' } });
      return r.matchedCount > 0;
    },
  });

  // 5) Club media (cover/logo) — thư mục con theo clubId, file: cover.ext / logo.ext
  const clubRoot = path.join(UPLOADS, 'club-media');
  if (fs.existsSync(clubRoot)) {
    for (const clubId of fs.readdirSync(clubRoot)) {
      const dir = path.join(clubRoot, clubId);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const file of listFiles(dir)) {
        const kind = path.basename(file, path.extname(file)); // 'cover' | 'logo'
        const field = kind === 'cover' ? 'coverImage' : 'logoImage';
        const extField = kind === 'cover' ? 'coverFileExt' : 'logoFileExt';
        const { dataUri } = toDataUri(path.join(dir, file));
        try {
          const res = await uploadDataUri(dataUri, { folder: `fevents/club-media/${clubId}`, publicId: kind });
          if (!res?.url) { skipped += 1; continue; }
          const r = await Club.updateOne({ _id: clubId }, { $set: { [field]: res.url, [extField]: '' } });
          if (r.matchedCount > 0) { uploaded += 1; console.log(`[club-${kind}] ${clubId} -> ${res.url}`); }
          else skipped += 1;
        } catch (e) { skipped += 1; console.warn(`[club-${kind}] ${clubId} LỖI:`, e.message); }
      }
    }
  }

  // 6) Speaker avatars — event-speakers/{eventId}/{index}.ext
  const spkRoot = path.join(UPLOADS, 'speaker-avatars');
  if (fs.existsSync(spkRoot)) {
    for (const eventId of fs.readdirSync(spkRoot)) {
      const dir = path.join(spkRoot, eventId);
      if (!fs.statSync(dir).isDirectory()) continue;
      const ev = await Event.findById(eventId).select('speakers speakerAvatarExts').lean();
      if (!ev) { skipped += 1; continue; }
      const speakers = Array.isArray(ev.speakers) ? [...ev.speakers] : [];
      const exts = Array.isArray(ev.speakerAvatarExts) ? [...ev.speakerAvatarExts] : [];
      for (const file of listFiles(dir)) {
        const index = Number(path.basename(file, path.extname(file)));
        if (!Number.isInteger(index) || !speakers[index]) continue;
        const { dataUri } = toDataUri(path.join(dir, file));
        try {
          const res = await uploadDataUri(dataUri, { folder: `fevents/speaker-avatars/${eventId}`, publicId: String(index) });
          if (!res?.url) { skipped += 1; continue; }
          speakers[index] = { ...speakers[index], avatar: res.url };
          exts[index] = '';
          uploaded += 1; console.log(`[speaker] ${eventId}#${index} -> ${res.url}`);
        } catch (e) { skipped += 1; console.warn(`[speaker] ${eventId}#${index} LỖI:`, e.message); }
      }
      await Event.updateOne({ _id: eventId }, { $set: { speakers, speakerAvatarExts: exts } });
    }
  }

  // 7) Proposal covers
  await migrateSimple({
    label: 'proposal-cover', dir: path.join(UPLOADS, 'proposal-covers'),
    folder: 'fevents/proposal-covers',
    apply: async (id, url) => {
      const r = await EventProposal.updateOne({ _id: id }, { $set: { image: url, coverFileExt: '' } });
      return r.matchedCount > 0;
    },
  });

  // 8) Event plans — event-plans/{scope}/{id}.ext  (raw resource)
  const planRoot = path.join(UPLOADS, 'event-plans');
  const scopeModel = { events: Event, proposals: EventProposal, timelines: ClubSemesterTimeline };
  if (fs.existsSync(planRoot)) {
    for (const scope of fs.readdirSync(planRoot)) {
      const dir = path.join(planRoot, scope);
      if (!fs.statSync(dir).isDirectory()) continue;
      const Model = scopeModel[scope];
      if (!Model) continue;
      for (const file of listFiles(dir)) {
        const id = path.basename(file, path.extname(file));
        const { dataUri } = toDataUri(path.join(dir, file));
        try {
          const res = await uploadDataUri(dataUri, {
            folder: `fevents/event-plans/${scope}`, publicId: id, resourceType: 'raw',
          });
          if (!res?.url) { skipped += 1; continue; }
          const r = await Model.updateOne({ _id: id }, { $set: { eventPlanFile: res.url, eventPlanFileExt: '' } });
          if (r.matchedCount > 0) { uploaded += 1; console.log(`[plan-${scope}] ${id} -> ${res.url}`); }
          else skipped += 1;
        } catch (e) { skipped += 1; console.warn(`[plan-${scope}] ${id} LỖI:`, e.message); }
      }
    }
  }

  console.log(`\nHoàn tất. Đã upload & cập nhật: ${uploaded}. Bỏ qua: ${skipped}.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => { console.error('Migration lỗi:', e); process.exit(1); });
