/**
 * Phase 3 — migrate event plan files + speaker avatars from MongoDB to disk
 *
 * Usage:
 *   node scripts/migrateEventAttachments.js
 *   node scripts/migrateEventAttachments.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const EventProposal = require('../src/models/EventProposal');
const ClubSemesterTimeline = require('../src/models/ClubSemesterTimeline');
const { clearEventCache } = require('../src/utils/eventCache');
const { isDataUri, isImageDataUri } = require('../src/utils/dataUriStorage');
const {
  writePlanFromDataUri,
  hasStoredPlanFile,
  PLAN_SCOPES,
} = require('../src/utils/eventPlanStorage');
const { writeSpeakerAvatarFromDataUri } = require('../src/utils/speakerAvatarStorage');
const { resolveEventSpeakers } = require('../src/constants/eventSpeaker');

const DRY_RUN = process.argv.includes('--dry-run');

async function migratePlans(Model, scope, label) {
  const rows = await Model.find({ eventPlanFile: /^data:/i }).select('_id eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt').lean();
  let count = 0;
  for (const row of rows) {
    const id = String(row._id);
    const src = row.eventPlanFile;
    if (!isDataUri(src)) continue;
    if (DRY_RUN) {
      console.log(`[would migrate plan:${label}] ${id}`);
      count += 1;
      continue;
    }
    const ext = await writePlanFromDataUri(scope, id, src, row.eventPlanFileMime, row.eventPlanFileName);
    await Model.updateOne({ _id: row._id }, { $set: { eventPlanFileExt: ext, eventPlanFile: '' } });
    console.log(`[plan:${label}] ${id} → .${ext}`);
    count += 1;
  }
  return count;
}

async function migrateEventSpeakers() {
  const events = await Event.find({
    $or: [{ 'speakers.avatar': /^data:image/i }, { speakerAvatar: /^data:image/i }],
  })
    .select('_id speakers speaker speakerRole speakerAvatar speakerAvatarExts')
    .lean();

  let count = 0;
  for (const event of events) {
    const id = String(event._id);
    const speakers = resolveEventSpeakers(event);
    const exts = Array.isArray(event.speakerAvatarExts) ? [...event.speakerAvatarExts] : [];
    let changed = false;

    for (let i = 0; i < speakers.length; i += 1) {
      const avatar = speakers[i]?.avatar || '';
      if (!isImageDataUri(avatar)) continue;
      if (DRY_RUN) {
        console.log(`[would migrate speaker] ${id} #${i}`);
        count += 1;
        continue;
      }
      const ext = await writeSpeakerAvatarFromDataUri(id, i, avatar);
      exts[i] = ext;
      speakers[i].avatar = '';
      changed = true;
      count += 1;
    }

    if (!DRY_RUN && changed) {
      await Event.updateOne(
        { _id: event._id },
        {
          $set: {
            speakers,
            speakerAvatarExts: exts,
            speaker: speakers[0]?.name || event.speaker || '',
            speakerRole: speakers[0]?.role || event.speakerRole || '',
            speakerAvatar: speakers[0]?.avatar || '',
          },
        }
      );
      console.log(`[speaker] ${id} migrated ${speakers.length} slot(s)`);
    }
  }
  return count;
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI in BE/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(DRY_RUN ? '[dry-run] Connected.' : 'Connected.');

  const planEvents = await migratePlans(Event, PLAN_SCOPES.events, 'events');
  const planProposals = await migratePlans(EventProposal, PLAN_SCOPES.proposals, 'proposals');
  const planTimelines = await migratePlans(ClubSemesterTimeline, PLAN_SCOPES.timelines, 'timelines');
  const speakers = await migrateEventSpeakers();

  if (!DRY_RUN) clearEventCache();

  console.log('');
  console.log(
    `Done. plans(events=${planEvents}, proposals=${planProposals}, timelines=${planTimelines}) speakers=${speakers}${DRY_RUN ? ' (dry-run)' : ''}`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
