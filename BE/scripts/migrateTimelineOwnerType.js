/**
 * One-off: set ownerType/ownerLabel on legacy club timelines missing the field.
 * Run: node BE/scripts/migrateTimelineOwnerType.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ClubSemesterTimeline = require('../src/models/ClubSemesterTimeline');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const result = await ClubSemesterTimeline.updateMany(
    { $or: [{ ownerType: { $exists: false } }, { ownerType: null }, { ownerType: '' }] },
    { $set: { ownerType: 'club' } }
  );
  const labelResult = await ClubSemesterTimeline.updateMany(
    { ownerType: 'club', $or: [{ ownerLabel: '' }, { ownerLabel: { $exists: false } }] },
    [{ $set: { ownerLabel: '$clubName' } }]
  );
  console.log('ownerType migrated:', result.modifiedCount);
  console.log('ownerLabel backfilled:', labelResult.modifiedCount);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
