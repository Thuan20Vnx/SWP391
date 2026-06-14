/**
 * Gán quản lý 2 CLB cho một tài khoản club_manager.
 *
 * Chạy:
 *   node seed-dual-club-manager.js
 *   node seed-dual-club-manager.js <email> <slug1> <slug2>
 */
require('dotenv').config();

const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const SchoolMember = require('./src/models/SchoolMember');
const Club = require('./src/models/Club');

const email = (process.argv[2] || 'tuan07375@gmail.com').trim().toLowerCase();
const clubSlugs = process.argv.slice(3).length >= 2
  ? process.argv.slice(3)
  : ['fu-dever', 'f-soft-club'];

const seedDualClubManager = async () => {
  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`❌ Không tìm thấy user: ${email}`);
    process.exit(1);
  }

  user.role = 'club_manager';
  await user.save();

  await SchoolMember.updateOne(
    { email },
    { $set: { role: 'club_manager', studentId: user.studentId || '' } },
    { upsert: true }
  );

  const assigned = [];
  for (const slug of clubSlugs) {
    const club = await Club.findOne({ slug });
    if (!club) {
      console.warn(`⚠️  Không tìm thấy CLB slug "${slug}" — bỏ qua.`);
      continue;
    }
    club.managedBy = user._id;
    if (!club.president?.trim()) {
      club.president = user.fullname || 'Chủ nhiệm CLB';
    }
    await club.save();
    assigned.push(club);
  }

  if (assigned.length < 2) {
    console.warn(`⚠️  Chỉ gán được ${assigned.length} CLB. Chạy \`node seed-clubs.js\` nếu thiếu dữ liệu.`);
  }

  console.log('====================================');
  console.log(`✅ Đã gán quản lý CLB cho: ${user.email}`);
  console.log(`   Họ tên : ${user.fullname}`);
  console.log(`   Role   : ${user.role}`);
  console.log(`   User ID: ${user._id}`);
  console.log('--- CLB đang quản lý ---');
  assigned.forEach((club) => {
    console.log(`   • ${club.name} (${club.slug})`);
  });
  console.log('====================================');
  console.log('Đăng xuất / đăng nhập lại FE → menu avatar → "Đổi câu lạc bộ"');

  process.exit(0);
};

seedDualClubManager().catch((err) => {
  console.error('❌ seed-dual-club-manager error:', err.message);
  process.exit(1);
});
