/**
 * Phase 2 — chuyển ảnh bìa base64 trong MongoDB ra file uploads/event-covers/
 *
 * Usage:
 *   node scripts/migrateEventCoversToFiles.js
 *   node scripts/migrateEventCoversToFiles.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const { clearEventCache } = require('../src/utils/eventCache');
const {
  isDataUri,
  writeCoverFromDataUri,
  hasCoverFile,
  deleteCoverFile,
} = require('../src/utils/eventCoverStorage');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI in BE/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(DRY_RUN ? '[dry-run] Connected.' : 'Connected.');

  const candidates = await Event.find({
    $or: [
      { thumbnail: /^data:image/i },
      { image: /^data:image/i },
    ],
  })
    .select('_id title thumbnail image coverFileExt')
    .lean();

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const ev of candidates) {
    const id = String(ev._id);
    const src = ev.thumbnail || ev.image || '';

    if (!isDataUri(src)) {
      skipped += 1;
      continue;
    }

    if (ev.coverFileExt && hasCoverFile(id)) {
      if (!DRY_RUN) {
        await Event.updateOne({ _id: ev._id }, { $set: { thumbnail: '', image: '' } });
      }
      console.log(`[cleanup-db] ${id} — file exists, cleared base64 fields`);
      migrated += 1;
      continue;
    }

    try {
      if (DRY_RUN) {
        console.log(`[would migrate] ${id} — ${ev.title || '(no title)'}`);
        migrated += 1;
        continue;
      }

      const ext = await writeCoverFromDataUri(id, src);
      await Event.updateOne(
        { _id: ev._id },
        { $set: { coverFileExt: ext, thumbnail: '', image: '' } }
      );
      console.log(`[migrated] ${id} → .${ext}`);
      migrated += 1;
    } catch (err) {
      console.error(`[error] ${id}:`, err.message);
      errors += 1;
    }
  }

  // Events already on disk but DB still has base64 duplicate
  const withFileExt = await Event.find({ coverFileExt: { $ne: '' } })
    .select('_id thumbnail image coverFileExt')
    .lean();

  for (const ev of withFileExt) {
    const id = String(ev._id);
    const src = ev.thumbnail || ev.image || '';
    if (!isDataUri(src)) continue;
    if (!hasCoverFile(id)) {
      if (!DRY_RUN) {
        await Event.updateOne({ _id: ev._id }, { $unset: { coverFileExt: '' } });
        deleteCoverFile(id);
      }
      console.log(`[repair] ${id} — coverFileExt set but file missing, reset`);
      continue;
    }
    if (!DRY_RUN) {
      await Event.updateOne({ _id: ev._id }, { $set: { thumbnail: '', image: '' } });
    }
    console.log(`[cleanup-db] ${id} — removed leftover base64`);
    migrated += 1;
  }

  if (!DRY_RUN) {
    clearEventCache();
  }

  console.log('');
  console.log(`Done. migrated=${migrated} skipped=${skipped} errors=${errors}${DRY_RUN ? ' (dry-run)' : ''}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
