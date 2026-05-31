/**
 * Tạo hoặc nâng cấp tài khoản ICPDP trong MongoDB.
 *
 * Chạy:
 *   node seed-icpdp.js
 *   node seed-icpdp.js <email> <password> [fullname]
 *
 * Hoặc dùng biến môi trường: ICPDP_EMAIL, ICPDP_PASSWORD, ICPDP_FULLNAME
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');

const email = (
  process.argv[2]
  || process.env.ICPDP_EMAIL
  || 'icpdp.test@fpt.edu.vn'
).trim().toLowerCase();

const password = process.argv[3] || process.env.ICPDP_PASSWORD || 'Icpdp@2026';
const fullname = process.argv[4] || process.env.ICPDP_FULLNAME || 'Phòng ICPDP (Test)';

const seedIcpdp = async () => {
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 10);
  let user = await User.findOne({ email });

  if (user) {
    user.role = 'icpdp';
    user.fullname = fullname;
    user.course = user.course || 'K18';
    user.campus = user.campus || 'FPT University Da Nang';
    if (password) {
      user.passwordHash = passwordHash;
      user.authProvider = 'local';
    }
    await user.save();
    console.log('Đã cập nhật user hiện có → role: icpdp');
  } else {
    user = await User.create({
      fullname,
      email,
      phone: `09${String(Date.now()).slice(-8)}`,
      passwordHash,
      authProvider: 'local',
      role: 'icpdp',
      course: 'K18',
      campus: 'FPT University Da Nang',
      studentId: '',
    });
    console.log('Đã tạo tài khoản ICPDP mới.');
  }

  console.log('====================================');
  console.log('Email:    ', email);
  console.log('Mật khẩu: ', password);
  console.log('Role:     ', user.role);
  console.log('Fullname: ', user.fullname);
  console.log('====================================');
  console.log('Đăng nhập FE → redirect /icpdp');

  process.exit(0);
};

seedIcpdp().catch((err) => {
  console.error('seed-icpdp error:', err.message);
  process.exit(1);
});
