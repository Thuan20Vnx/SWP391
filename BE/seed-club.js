/**
 * Tạo hoặc cập nhật tài khoản quản lý CLB (role: club_manager).
 *
 * Chạy:
 *   node seed-club.js
 *   node seed-club.js <email> <password> [fullname]
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const SchoolMember = require('./src/models/SchoolMember');

const email = (
  process.argv[2]
  || process.env.CLUB_EMAIL
  || 'tuan07375@gmail.com'
).trim().toLowerCase();

const password = process.argv[3] || process.env.CLUB_PASSWORD || 'TestPass123!';
const fullname = process.argv[4] || process.env.CLUB_FULLNAME || 'Nguyễn Văn Tuân';

const seedClubManager = async () => {
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 10);
  const role = 'club_manager';

  let member = await SchoolMember.findOne({ email });
  if (member) {
    member.role = role;
    await member.save();
    console.log('Đã cập nhật SchoolMember → club_manager');
  } else {
    await SchoolMember.create({ email, role, studentId: '' });
    console.log('Đã thêm SchoolMember whitelist.');
  }

  let user = await User.findOne({ email });
  if (user) {
    user.role = role;
    user.fullname = fullname;
    user.passwordHash = passwordHash;
    user.authProvider = 'local';
    user.campus = user.campus || 'FPT University Da Nang';
    await user.save();
    console.log('Đã cập nhật user → club_manager + mật khẩu local');
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
    console.log('Đã tạo user club_manager mới.');
  }

  console.log('====================================');
  console.log('Email:    ', email);
  console.log('Mật khẩu: ', password);
  console.log('Role:     ', user.role);
  console.log('Fullname: ', user.fullname);
  console.log('====================================');
  console.log('Đăng nhập FE → /quan-ly-clb');

  process.exit(0);
};

seedClubManager().catch((err) => {
  console.error('seed-club error:', err.message);
  process.exit(1);
});
