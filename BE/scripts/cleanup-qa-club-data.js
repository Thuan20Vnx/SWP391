/**
 * Xóa sự kiện QA và timeline test theo yêu cầu.
 * Usage: node scripts/cleanup-qa-club-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const EventProposal = require('../src/models/EventProposal');
const ClubSemesterTimeline = require('../src/models/ClubSemesterTimeline');
const { deleteCoverFile } = require('../src/utils/eventCoverStorage');

const EVENT_TITLES = [
  'QA Club Event B 1782075079185 v3',
  'QA Club Event B 1782075024908 v2',
  'QA Club Event B 1782074961750',
];

const TIMELINE_LABELS = ['Spring 2027', 'Summer 2026'];

async function deleteEventsByTitles(titles) {
  const events = await Event.find({ title: { $in: titles } }).lean();
  if (!events.length) {
    console.log('No matching events found.');
    return 0;
  }

  for (const ev of events) {
    console.log(`  event: [${ev.status}] ${ev.title} (${ev._id})`);
    if (ev.proposalId) {
      const deletedProposal = await EventProposal.findByIdAndDelete(ev.proposalId);
      if (deletedProposal) console.log(`    - deleted proposal ${ev.proposalId}`);
    }
    try {
      deleteCoverFile(String(ev._id));
    } catch {
      /* ignore */
    }
  }

  const result = await Event.deleteMany({ _id: { $in: events.map((e) => e._id) } });
  return result.deletedCount || 0;
}

async function deleteTimelinesByLabels(labels) {
  const timelines = await ClubSemesterTimeline.find({ semesterLabel: { $in: labels } }).lean();
  if (!timelines.length) {
    console.log('No matching timelines found.');
    return 0;
  }

  for (const tl of timelines) {
    console.log(`  timeline: [${tl.status}] ${tl.semesterLabel} (${tl._id}) club=${tl.clubName || '—'}`);
  }

  const result = await ClubSemesterTimeline.deleteMany({ _id: { $in: timelines.map((t) => t._id) } });
  return result.deletedCount || 0;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGO_URI in BE/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected.\n');

  console.log('Deleting QA events...');
  const eventCount = await deleteEventsByTitles(EVENT_TITLES);
  console.log(`Deleted ${eventCount} event(s).\n`);

  console.log('Deleting timelines...');
  const timelineCount = await deleteTimelinesByLabels(TIMELINE_LABELS);
  console.log(`Deleted ${timelineCount} timeline(s).\n`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
