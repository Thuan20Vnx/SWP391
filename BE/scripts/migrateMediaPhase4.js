/**
 * Phase 4 — migrate user avatars, announcement images, club media, partner media, proposal covers
 *
 * Usage:
 *   node scripts/migrateMediaPhase4.js
 *   node scripts/migrateMediaPhase4.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Announcement = require('../src/models/Announcement');
const Club = require('../src/models/Club');
const Partner = require('../src/models/Partner');
const PartnerEventRequest = require('../src/models/PartnerEventRequest');
const EventProposal = require('../src/models/EventProposal');
const { isDataUri, isImageDataUri } = require('../src/utils/dataUriStorage');
const { writeUserAvatarFromDataUri } = require('../src/utils/userAvatarStorage');
const { writeAnnouncementImageFromDataUri } = require('../src/utils/announcementImageStorage');
const { writeClubMediaFromDataUri } = require('../src/utils/clubMediaStorage');
const {
  writeCover,
  writeAttachment,
  writeSpeakerAvatar,
  writePartnerLogo,
} = require('../src/utils/partnerMediaStorage');
const path = require('path');
const { parseDataUri, extensionFromMime, writeBufferToFile } = require('../src/utils/dataUriStorage');

const DRY_RUN = process.argv.includes('--dry-run');
const PROPOSAL_COVERS = path.join(__dirname, '../uploads/proposal-covers');

async function migrateUsers() {
  const rows = await User.find({
    $or: [{ picture: /^data:image/i }, { avatar: /^data:image/i }],
  })
    .select('_id picture avatar avatarFileExt')
    .lean();
  let count = 0;
  for (const row of rows) {
    const id = String(row._id);
    const src = isImageDataUri(row.picture) ? row.picture : row.avatar;
    if (!isImageDataUri(src)) continue;
    if (DRY_RUN) {
      console.log(`[would migrate user avatar] ${id}`);
      count += 1;
      continue;
    }
    const ext = await writeUserAvatarFromDataUri(id, src);
    await User.updateOne({ _id: row._id }, { $set: { avatarFileExt: ext, picture: '', avatar: '' } });
    console.log(`[user avatar] ${id} → .${ext}`);
    count += 1;
  }
  return count;
}

async function migrateAnnouncements() {
  const rows = await Announcement.find({ image: /^data:image/i }).select('_id image imageFileExt').lean();
  let count = 0;
  for (const row of rows) {
    const id = String(row._id);
    if (DRY_RUN) {
      console.log(`[would migrate announcement image] ${id}`);
      count += 1;
      continue;
    }
    const ext = await writeAnnouncementImageFromDataUri(id, row.image);
    await Announcement.updateOne({ _id: row._id }, { $set: { imageFileExt: ext, image: '' } });
    console.log(`[announcement image] ${id} → .${ext}`);
    count += 1;
  }
  return count;
}

async function migrateClubs() {
  const rows = await Club.find({
    $or: [{ coverImage: /^data:image/i }, { logoImage: /^data:image/i }],
  })
    .select('_id coverImage logoImage coverFileExt logoFileExt')
    .lean();
  let count = 0;
  for (const row of rows) {
    const id = String(row._id);
    const updates = {};
    if (isImageDataUri(row.coverImage)) {
      if (DRY_RUN) console.log(`[would migrate club cover] ${id}`);
      else {
        updates.coverFileExt = await writeClubMediaFromDataUri(id, 'cover', row.coverImage);
        updates.coverImage = '';
        console.log(`[club cover] ${id} → .${updates.coverFileExt}`);
      }
      count += 1;
    }
    if (isImageDataUri(row.logoImage)) {
      if (DRY_RUN) console.log(`[would migrate club logo] ${id}`);
      else {
        updates.logoFileExt = await writeClubMediaFromDataUri(id, 'logo', row.logoImage);
        updates.logoImage = '';
        console.log(`[club logo] ${id} → .${updates.logoFileExt}`);
      }
      count += 1;
    }
    if (!DRY_RUN && Object.keys(updates).length) {
      await Club.updateOne({ _id: row._id }, { $set: updates });
    }
  }
  return count;
}

async function migratePartners() {
  const rows = await Partner.find({ logo: /^data:image/i }).select('_id logo logoFileExt').lean();
  let count = 0;
  for (const row of rows) {
    const id = String(row._id);
    if (DRY_RUN) {
      console.log(`[would migrate partner logo] ${id}`);
      count += 1;
      continue;
    }
    const ext = await writePartnerLogo(id, row.logo);
    await Partner.updateOne({ _id: row._id }, { $set: { logoFileExt: ext, logo: '' } });
    console.log(`[partner logo] ${id} → .${ext}`);
    count += 1;
  }
  return count;
}

async function migratePartnerRequests() {
  const rows = await PartnerEventRequest.find({
    $or: [
      { image: /^data:image/i },
      { 'attachments.url': /^data:/i },
      { 'speakers.avatar': /^data:image/i },
    ],
  })
    .select('_id image coverFileExt attachments speakers speakerAvatarExts')
    .lean();
  let count = 0;
  for (const row of rows) {
    const id = String(row._id);
    const updates = {};
    if (isImageDataUri(row.image)) {
      if (DRY_RUN) console.log(`[would migrate partner request cover] ${id}`);
      else {
        updates.coverFileExt = await writeCover(id, row.image);
        updates.image = '';
        console.log(`[partner request cover] ${id}`);
      }
      count += 1;
    }
    const attachments = [...(row.attachments || [])];
    let attachmentsChanged = false;
    for (let i = 0; i < attachments.length; i += 1) {
      const att = attachments[i];
      if (isDataUri(att?.url)) {
        if (DRY_RUN) console.log(`[would migrate partner attachment] ${id}#${i}`);
        else {
          const ext = await writeAttachment(id, i, att.url, att.mimeType, att.name);
          attachments[i] = { ...att, url: '', storedExt: ext };
          console.log(`[partner attachment] ${id}#${i}`);
        }
        attachmentsChanged = true;
        count += 1;
      }
    }
    if (attachmentsChanged && !DRY_RUN) updates.attachments = attachments;

    const speakers = [...(row.speakers || [])];
    const speakerAvatarExts = Array.isArray(row.speakerAvatarExts) ? [...row.speakerAvatarExts] : [];
    let speakersChanged = false;
    for (let i = 0; i < speakers.length; i += 1) {
      if (isImageDataUri(speakers[i]?.avatar)) {
        if (DRY_RUN) console.log(`[would migrate partner speaker] ${id}#${i}`);
        else {
          speakerAvatarExts[i] = await writeSpeakerAvatar(id, i, speakers[i].avatar);
          speakers[i] = { ...speakers[i], avatar: '' };
          console.log(`[partner speaker] ${id}#${i}`);
        }
        speakersChanged = true;
        count += 1;
      }
    }
    if (speakersChanged && !DRY_RUN) {
      updates.speakers = speakers;
      updates.speakerAvatarExts = speakerAvatarExts;
    }
    if (!DRY_RUN && Object.keys(updates).length) {
      await PartnerEventRequest.updateOne({ _id: row._id }, { $set: updates });
    }
  }
  return count;
}

async function migrateProposalCovers() {
  const rows = await EventProposal.find({ image: /^data:image/i }).select('_id image coverFileExt').lean();
  let count = 0;
  for (const row of rows) {
    const id = String(row._id);
    if (DRY_RUN) {
      console.log(`[would migrate proposal cover] ${id}`);
      count += 1;
      continue;
    }
    const { mime, buffer } = parseDataUri(row.image);
    const ext = extensionFromMime(mime, '', 'jpg');
    await writeBufferToFile(path.join(PROPOSAL_COVERS, `${id}.${ext}`), buffer);
    await EventProposal.updateOne({ _id: row._id }, { $set: { coverFileExt: ext, image: '' } });
    console.log(`[proposal cover] ${id} → .${ext}`);
    count += 1;
  }
  return count;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Missing MONGO_URI');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(DRY_RUN ? 'DRY RUN — Phase 4 media migration' : 'Phase 4 media migration');
  const totals = {
    users: await migrateUsers(),
    announcements: await migrateAnnouncements(),
    clubs: await migrateClubs(),
    partners: await migratePartners(),
    partnerRequests: await migratePartnerRequests(),
    proposalCovers: await migrateProposalCovers(),
  };
  console.log('Done:', totals);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
