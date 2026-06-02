/**
 * Database health check: collection stats, index sync, basic integrity checks.
 * Usage: node scripts/db-health.js [--sync] [--repair-counts] [--cleanup-orphans] [--dry-run]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const Event = require('../src/models/Event');
const EventRegistration = require('../src/models/EventRegistration');
const EventProposal = require('../src/models/EventProposal');
const EventReview = require('../src/models/EventReview');
const User = require('../src/models/User');
const SchoolMember = require('../src/models/SchoolMember');
const Club = require('../src/models/Club');
const ClubFollow = require('../src/models/ClubFollow');
const ClubMembership = require('../src/models/ClubMembership');
const Partner = require('../src/models/Partner');
const PartnerEventRequest = require('../src/models/PartnerEventRequest');
const Contract = require('../src/models/Contract');
const Announcement = require('../src/models/Announcement');

const MODELS = [
  User,
  SchoolMember,
  Event,
  EventRegistration,
  EventProposal,
  EventReview,
  Club,
  ClubFollow,
  ClubMembership,
  Partner,
  PartnerEventRequest,
  Contract,
  Announcement
];

const shouldSync = process.argv.includes('--sync');
const shouldRepairCounts = process.argv.includes('--repair-counts');
const shouldCleanupOrphans = process.argv.includes('--cleanup-orphans');
const isDryRun = process.argv.includes('--dry-run');

const findOrphanRegistrations = () =>
  EventRegistration.aggregate([
    { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'ev' } },
    { $match: { ev: { $size: 0 } } },
    {
      $project: {
        _id: 1,
        event: 1,
        user: 1,
        status: 1,
        registeredAt: 1,
        createdAt: 1
      }
    }
  ]);

const printSection = (title) => {
  console.log(`\n=== ${title} ===`);
};

const countCollections = async () => {
  printSection('Collection counts');
  for (const Model of MODELS) {
    const count = await Model.estimatedDocumentCount();
    console.log(`${Model.collection.name.padEnd(24)} ${count}`);
  }
};

const syncIndexes = async () => {
  printSection('Index sync');
  for (const Model of MODELS) {
    try {
      const result = await Model.syncIndexes();
      const keys = Object.keys(result || {});
      if (keys.length === 0) {
        console.log(`${Model.collection.name}: OK (no changes)`);
      } else {
        console.log(`${Model.collection.name}:`, result);
      }
    } catch (err) {
      console.error(`${Model.collection.name}: FAILED — ${err.message}`);
    }
  }
};

const listIndexes = async () => {
  printSection('Indexes per collection');
  for (const Model of MODELS) {
    const indexes = await Model.collection.indexes();
    console.log(`\n${Model.collection.name} (${indexes.length} indexes)`);
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
  }
};

const checkRegistrationDrift = async ({ repair = false } = {}) => {
  printSection(repair ? 'Repair: registeredCount sync' : 'Integrity: registeredCount vs EventRegistration');
  const events = await Event.find({}).select('_id title registeredCount').lean();
  let driftCount = 0;
  let repaired = 0;

  for (const ev of events) {
    const actual = await EventRegistration.countDocuments({
      event: ev._id,
      status: { $ne: 'cancelled' }
    });
    if (actual !== ev.registeredCount) {
      driftCount += 1;
      if (repair) {
        await Event.updateOne({ _id: ev._id }, { $set: { registeredCount: actual } });
        repaired += 1;
        console.log(`  FIXED ${ev.title?.slice(0, 40) || ev._id}: ${ev.registeredCount} → ${actual}`);
      } else {
        console.log(
          `  DRIFT ${ev.title?.slice(0, 40) || ev._id}: stored=${ev.registeredCount}, actual=${actual}`
        );
      }
    }
  }

  if (driftCount === 0) {
    console.log('  OK — all events match registration counts');
  } else if (!repair) {
    console.log(`  Found ${driftCount} event(s) with count drift (run with --repair-counts to fix)`);
  } else {
    console.log(`  Repaired ${repaired} event(s)`);
  }
};

const checkOrphans = async () => {
  printSection('Integrity: basic orphan checks');
  const [orphanRegs, annWithoutEvent] = await Promise.all([
    findOrphanRegistrations(),
    Announcement.aggregate([
      { $match: { eventId: { $ne: null } } },
      { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'ev' } },
      { $match: { ev: { $size: 0 } } },
      { $count: 'n' }
    ])
  ]);
  console.log(`  Registrations without event: ${orphanRegs.length}`);
  console.log(`  Announcements with missing eventId ref: ${annWithoutEvent[0]?.n || 0}`);
  return orphanRegs.length;
};

const cleanupOrphanRegistrations = async ({ dryRun = false } = {}) => {
  printSection(dryRun ? 'Dry run: orphan registrations' : 'Cleanup: orphan registrations');
  const orphans = await findOrphanRegistrations();

  if (orphans.length === 0) {
    console.log('  OK — no orphan registrations to remove');
    return 0;
  }

  orphans.forEach((r) => {
    const at = r.registeredAt || r.createdAt;
    const atLabel = at ? new Date(at).toISOString().slice(0, 10) : '—';
    console.log(
      `  ${dryRun ? 'WOULD DELETE' : 'DELETE'} ${r._id} | event=${r.event} | user=${r.user} | ${r.status} | ${atLabel}`
    );
  });

  if (dryRun) {
    console.log(`  Found ${orphans.length} orphan registration(s). Re-run without --dry-run to delete.`);
    return orphans.length;
  }

  const result = await EventRegistration.deleteMany({
    _id: { $in: orphans.map((r) => r._id) }
  });
  console.log(`  Removed ${result.deletedCount} orphan registration(s)`);
  return result.deletedCount;
};

const main = async () => {
  await connectDB();
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Mode: ${[
    shouldSync && 'sync indexes',
    shouldRepairCounts && 'repair counts',
    shouldCleanupOrphans && (isDryRun ? 'cleanup orphans (dry run)' : 'cleanup orphans')
  ].filter(Boolean).join(' + ') || 'audit only'}`);

  if (shouldCleanupOrphans && !shouldSync && !shouldRepairCounts) {
    await cleanupOrphanRegistrations({ dryRun: isDryRun });
    if (!isDryRun) {
      await checkOrphans();
    }
    printSection('Done');
    await mongoose.disconnect();
    process.exit(0);
    return;
  }

  await countCollections();
  if (shouldSync) {
    await syncIndexes();
  }
  await listIndexes();
  await checkRegistrationDrift({ repair: shouldRepairCounts });
  if (shouldCleanupOrphans) {
    await cleanupOrphanRegistrations({ dryRun: isDryRun });
  }
  await checkOrphans();

  printSection('Done');
  await mongoose.disconnect();
  process.exit(0);
};

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
