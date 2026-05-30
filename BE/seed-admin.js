/**
 * Tạo hoặc nâng cấp tài khoản admin trong MongoDB.
 *
 * Chạy:
 *   node seed-admin.js
 *   node seed-admin.js <email> <password> [fullname]
 *
 * Hoặc dùng biến môi trường: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULLNAME
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');

const email = (
  process.argv[2]
  || process.env.ADMIN_EMAIL
  || 'nhatlink888@gmail.com'
).trim().toLowerCase();

const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin@2026';
const fullname = process.argv[4] || process.env.ADMIN_FULLNAME || 'Nguyễn Nhật Linh';

const seedAdmin = async () => {
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 10);
  let user = await User.findOne({ email });

  if (user) {
    user.role = 'admin';
    user.fullname = fullname;
    user.course = user.course || 'K18';
    user.campus = user.campus || 'FPT University Da Nang';
    if (password) {
      user.passwordHash = passwordHash;
      user.authProvider = 'local';
    }
    await user.save();
    console.log(`Đã cập nhật user hiện có → role: admin`);
  } else {
    user = await User.create({
      fullname,
      email,
      phone: `09${String(Date.now()).slice(-8)}`,
      passwordHash,
      authProvider: 'local',
      role: 'admin',
      course: 'K18',
      campus: 'FPT University Da Nang',
      studentId: '',
    });
    console.log('Đã tạo tài khoản admin mới.');
  }

  console.log('====================================');
  console.log('Email:    ', email);
  console.log('Mật khẩu: ', password);
  console.log('Role:     ', user.role);
  console.log('Fullname: ', user.fullname);
  console.log('====================================');
  console.log('Đăng nhập FE → redirect /admin, menu ☰ + IT Admin trên header.');

  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error('seed-admin error:', err.message);
  process.exit(1);
});
