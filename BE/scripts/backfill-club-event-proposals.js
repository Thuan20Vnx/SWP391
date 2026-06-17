/**
 * Đồng bộ EventProposal cho sự kiện CLB cũ (chưa có proposalId).
 * Chạy: node scripts/backfill-club-event-proposals.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const EventProposal = require('../src/models/EventProposal');
const Club = require('../src/models/Club');

const mapEventStatusToProposal = (status) => {
  if (status === 'pending_admin') return 'pending_admin';
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'revision') return 'revision';
  return 'pending_icpdp';
};

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI trong .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Đã kết nối MongoDB');

  const events = await Event.find({
    clubId: { $ne: null },
    proposalId: null,
    isDeleted: { $ne: true },
  }).limit(500);

  let synced = 0;
  for (const event of events) {
    const club = event.clubId ? await Club.findById(event.clubId).lean() : null;
    if (event.status === 'pending') {
      event.status = 'pending_icpdp';
    }

    const proposal = await EventProposal.create({
      title: event.title,
      description: event.description || '',
      learningOutcomes: event.learningOutcomes || [],
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location || '',
      totalTickets: event.totalTickets || event.capacity || 100,
      ticketPrice: event.ticketPrice ?? 0,
      ticketTypes: event.ticketTypes || [],
      expectedAttendees: event.expectedAttendees ?? 0,
      image: event.thumbnail || event.image || '',
      clubId: club ? String(club._id) : String(event.clubId),
      clubName: club?.name || '',
      submittedByEmail: event.createdByEmail || '',
      status: mapEventStatusToProposal(event.status),
      linkedEventId: event._id,
      eventId: event.status === 'approved' ? event._id : null,
    });

    event.proposalId = proposal._id;
    await event.save();
    synced += 1;
    console.log(`  ✓ ${event.title} → proposal ${proposal._id} (${proposal.status})`);
  }

  console.log(`\nHoàn tất: ${synced}/${events.length} sự kiện CLB đã đồng bộ.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
