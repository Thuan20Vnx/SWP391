/**
 * Gán clubId cho sự kiện CLB cũ (createdBy = club_manager, clubId null).
 * Ưu tiên CLB fu-dever nếu user quản lý, không thì CLB đầu tiên trong danh sách.
 */
require('dotenv').config();
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const { findManagedClubs } = require('../src/services/club.service');

(async () => {
  await connectDB();

  const orphans = await Event.find({
    $or: [{ clubId: null }, { clubId: { $exists: false } }],
    createdBy: { $exists: true, $ne: null },
  });

  let updated = 0;
  let skipped = 0;

  for (const event of orphans) {
    const user = await User.findById(event.createdBy);
    if (!user || user.role !== 'club_manager') {
      skipped += 1;
      continue;
    }

    const clubs = await findManagedClubs(user._id);
    if (!clubs.length) {
      skipped += 1;
      continue;
    }

    const target = clubs.find((c) => c.slug === 'fu-dever') || clubs[0];
    event.clubId = target._id;
    await event.save();
    updated += 1;
    console.log(`✓ "${event.title}" → ${target.name} (${target.slug})`);
  }

  console.log(`\nDone. Updated: ${updated}, skipped: ${skipped}, total orphans scanned: ${orphans.length}`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
