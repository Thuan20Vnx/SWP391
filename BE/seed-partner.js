/**
 * Tạo hoặc cập nhật tài khoản đối tác (role: partner) + hồ sơ Partner đã duyệt.
 *
 * Chạy:
 *   node seed-partner.js
 *   node seed-partner.js <email> <password> [fullname]
 *
 * Hoặc biến môi trường: PARTNER_EMAIL, PARTNER_PASSWORD, PARTNER_FULLNAME
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Partner = require('./src/models/Partner');

const email = (
  process.argv[2]
  || process.env.PARTNER_EMAIL
  || 'partner.test@fsoft.com'
).trim().toLowerCase();

const password = process.argv[3] || process.env.PARTNER_PASSWORD || 'Partner@2026';
const fullname = process.argv[4] || process.env.PARTNER_FULLNAME || 'Phạm Minh Tuấn';

const seedPartner = async () => {
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 10);
  let user = await User.findOne({ email });

  if (user) {
    user.role = 'partner';
    user.fullname = fullname;
    user.campus = user.campus || 'FPT University Da Nang';
    if (password) {
      user.passwordHash = passwordHash;
      user.authProvider = 'local';
    }
    await user.save();
    console.log('Đã cập nhật user hiện có → role: partner');
  } else {
    user = await User.create({
      fullname,
      email,
      phone: `09${String(Date.now()).slice(-8)}`,
      passwordHash,
      authProvider: 'local',
      role: 'partner',
      course: '',
      campus: 'FPT University Da Nang',
      studentId: '',
    });
    console.log('Đã tạo tài khoản partner mới.');
  }

  let partner = await Partner.findOne({ email });
  if (partner) {
    partner.status = 'approved';
    partner.name = 'Công ty TNHH Phần mềm FPT (FPT Software)';
    partner.representative = fullname;
    partner.phone = partner.phone || '+84 24 3768 9048';
    partner.address =
      partner.address
      || 'Tòa nhà FPT, Phố Duy Tân, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội';
    partner.partnerCode = partner.partnerCode || 'FPT-SW-001';
    partner.category = partner.category || 'Công nghệ';
    partner.approvedByEmail = partner.approvedByEmail || 'seed@system';
    partner.adminApprovedAt = partner.adminApprovedAt || new Date();
    await partner.save();
    console.log('Đã cập nhật hồ sơ Partner (approved).');
  } else {
    partner = await Partner.create({
      name: 'Công ty TNHH Phần mềm FPT (FPT Software)',
      email,
      phone: '+84 24 3768 9048',
      representative: fullname,
      address: 'Tòa nhà FPT, Phố Duy Tân, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
      partnerCode: 'FPT-SW-001',
      category: 'Công nghệ',
      proposedEventTitle: 'Tech Talk 2026 — FPT Software',
      status: 'approved',
      approvedByEmail: 'seed@system',
      adminApprovedAt: new Date(),
    });
    console.log('Đã tạo hồ sơ Partner mới (approved).');
  }

  console.log('====================================');
  console.log('Email:    ', email);
  console.log('Mật khẩu: ', password);
  console.log('Role:     ', user.role);
  console.log('Fullname: ', user.fullname);
  console.log('PartnerId:', partner._id.toString());
  console.log('====================================');
  console.log('Đăng nhập FE → redirect /partner');

  process.exit(0);
};

seedPartner().catch((err) => {
  console.error('seed-partner error:', err.message);
  process.exit(1);
});
