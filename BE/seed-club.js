/**
 * Tạo hoặc cập nhật tài khoản quản lý CLB (role: club_manager).
 *
 * Chạy:
 *   node seed-club.js
 *   node seed-club.js <email> <password> [fullname] [clubSlug]
 *
 * Hoặc biến môi trường: CLUB_EMAIL, CLUB_PASSWORD, CLUB_FULLNAME, CLUB_SLUG
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const SchoolMember = require('./src/models/SchoolMember');
const Club = require('./src/models/Club');

const email = (
  process.argv[2]
  || process.env.CLUB_EMAIL
  || 'club.test@fpt.edu.vn'
).trim().toLowerCase();

const password = process.argv[3] || process.env.CLUB_PASSWORD || 'Club@2026';
const fullname = process.argv[4] || process.env.CLUB_FULLNAME || 'Ban Chủ nhiệm FU-DEVER';
const clubSlug = process.argv[5] || process.env.CLUB_SLUG || 'fu-dever';

const seedClubManager = async () => {
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 10);
  const role = 'club_manager';

  let member = await SchoolMember.findOne({ email });
  if (member) {
    member.role = role;
    await member.save();
    console.log('Đã cập nhật SchoolMember → role: club_manager');
  } else {
    await SchoolMember.create({ email, role, studentId: '' });
    console.log('Đã thêm email vào SchoolMember whitelist.');
  }

  let user = await User.findOne({ email });
  if (user) {
    user.role = role;
    user.fullname = fullname;
    user.campus = user.campus || 'FPT University Da Nang';
    if (password) {
      user.passwordHash = passwordHash;
      user.authProvider = 'local';
    }
    await user.save();
    console.log('Đã cập nhật user hiện có → role: club_manager');
  } else {
    user = await User.create({
      fullname,
      email,
      phone: `09${String(Date.now()).slice(-8)}`,
      passwordHash,
      authProvider: 'local',
      role,
      course: 'K18',
      campus: 'FPT University Da Nang',
      studentId: '',
    });
    console.log('Đã tạo tài khoản quản lý CLB mới.');
  }

  const club = await Club.findOne({ slug: clubSlug });
  if (club) {
    console.log(`CLB liên kết: ${club.name} (${club.slug})`);
  } else {
    console.log(`⚠ Không tìm thấy CLB slug "${clubSlug}". Chạy \`node seed-clubs.js\` nếu cần dữ liệu CLB.`);
  }

  console.log('====================================');
  console.log('Email:    ', email);
  console.log('Mật khẩu: ', password);
  console.log('Role:     ', user.role);
  console.log('Fullname: ', user.fullname);
  console.log('CLB slug: ', clubSlug);
  console.log('====================================');
  console.log('Đăng nhập FE → role Quản lý CLB (club_manager).');

  process.exit(0);
};

seedClubManager().catch((err) => {
  console.error('seed-club error:', err.message);
  process.exit(1);
});
