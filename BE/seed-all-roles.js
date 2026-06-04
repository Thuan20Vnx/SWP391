/**
 * Tạo / cập nhật tài khoản kiểm thử cho tất cả role.
 *
 * Chạy: node seed-all-roles.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const SchoolMember = require('./src/models/SchoolMember');
const Partner = require('./src/models/Partner');

const DEFAULT_PASSWORD = 'Test@2026';

const ACCOUNTS = [
  {
    role: 'admin',
    email: 'admin.test@fpt.edu.vn',
    fullname: 'Admin Test',
    redirect: '/admin',
  },
  {
    role: 'ctsv',
    email: 'ctsv.test@fpt.edu.vn',
    fullname: 'CTSV Test',
    redirect: '/ctsv',
  },
  {
    role: 'icpdp',
    email: 'icpdp.test@fpt.edu.vn',
    fullname: 'ICPDP Test',
    redirect: '/icpdp',
  },
  {
    role: 'partner',
    email: 'partner.test@fpt.edu.vn',
    fullname: 'Partner Test',
    redirect: '/partner',
    partnerProfile: true,
  },
  {
    role: 'club_manager',
    email: 'club.test@fpt.edu.vn',
    fullname: 'Club Manager Test',
    redirect: '/quan-ly-clb',
    schoolMember: { role: 'club_manager', studentId: '' },
  },
  {
    role: 'student',
    email: 'student.test@fpt.edu.vn',
    fullname: 'Sinh viên Test',
    redirect: '/',
    schoolMember: { role: 'student', studentId: 'DE180299' },
  },
  {
    role: 'staff',
    email: 'staff.test@fpt.edu.vn',
    fullname: 'Giảng viên Test',
    redirect: '/',
    schoolMember: { role: 'staff', studentId: '' },
  },
  {
    role: 'guest',
    email: 'guest.test@gmail.com',
    fullname: 'Khách Test',
    redirect: '/',
  },
];

const upsertSchoolMember = async (email, data) => {
  if (!data) return;
  await SchoolMember.findOneAndUpdate(
    { email },
    { email, role: data.role, studentId: data.studentId || '' },
    { upsert: true, new: true },
  );
};

const upsertPartnerProfile = async (email, fullname) => {
  const payload = {
    name: 'Công ty TNHH Phần mềm FPT (Demo)',
    email,
    phone: '+84 236 123 4567',
    representative: fullname,
    address: 'FPT University Da Nang — Demo Partner',
    partnerCode: 'DEMO-PARTNER-001',
    category: 'Công nghệ',
    proposedEventTitle: 'Sự kiện demo đối tác',
    status: 'approved',
    approvedByEmail: 'seed@system',
    adminApprovedAt: new Date(),
  };
  await Partner.findOneAndUpdate({ email }, payload, { upsert: true, new: true });
};

const upsertUser = async (account, passwordHash, index) => {
  const email = account.email.trim().toLowerCase();
  let user = await User.findOne({ email });
  const phone = user?.phone || `09${String(10000000 + index).slice(-8)}`;

  const base = {
    fullname: account.fullname,
    email,
    phone,
    passwordHash,
    authProvider: 'local',
    role: account.role,
    campus: 'FPT University Da Nang',
    course: account.role === 'student' ? 'K18' : account.role === 'admin' ? 'K18' : '',
    studentId: account.schoolMember?.studentId || '',
    isActive: true,
  };

  if (user) {
    Object.assign(user, base);
    await user.save();
  } else {
    user = await User.create(base);
  }

  return user;
};

const seedAllRoles = async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  console.log('Tạo tài khoản kiểm thử (tất cả role)\n');
  console.log(`Mật khẩu chung: ${DEFAULT_PASSWORD}\n`);
  console.log('Role          | Email                      | Sau đăng nhập');
  console.log('--------------|----------------------------|------------------');

  for (let i = 0; i < ACCOUNTS.length; i += 1) {
    const account = ACCOUNTS[i];
    const email = account.email.trim().toLowerCase();

    if (account.schoolMember) {
      await upsertSchoolMember(email, account.schoolMember);
    }

    await upsertUser(account, passwordHash, i);

    if (account.partnerProfile) {
      await upsertPartnerProfile(email, account.fullname);
    }

    console.log(
      `${account.role.padEnd(13)} | ${email.padEnd(26)} | ${account.redirect}`,
    );
  }

  console.log('\nHoàn tất.');
  process.exit(0);
};

seedAllRoles().catch((err) => {
  console.error('seed-all-roles error:', err.message);
  process.exit(1);
});
