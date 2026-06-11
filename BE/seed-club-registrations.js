/**
 * Seed đơn đăng ký thành lập CLB mới (chờ ICPDP).
 * Chạy: node seed-club-registrations.js
 */
require('dotenv').config();
const connectDB = require('./src/config/db');
const ClubRegistration = require('./src/models/ClubRegistration');

const SAMPLES = [
  {
    clubName: 'FPT Robotics Club',
    category: 'Công nghệ',
    description:
      'Câu lạc bộ robot và tự động hóa — tổ chức workshop lắp ráp, thi đấu nội bộ và dự án IoT cho sinh viên.',
    president: 'Nguyễn Minh Khôi',
    presidentEmail: 'khoi.robotics@fpt.edu.vn',
    activityField: 'Robot, IoT',
    scale: '30–50 thành viên',
    logoText: 'FRC',
    logoColor: '#7c3aed',
    status: 'pending_icpdp',
  },
  {
    clubName: 'FPT Green Campus',
    category: 'Tình nguyện',
    description:
      'Hoạt động môi trường, tái chế và trồng cây tại campus — phối hợp CTSV trong các chiến dịch xanh.',
    president: 'Trần Thị Lan',
    presidentEmail: 'lan.green@fpt.edu.vn',
    activityField: 'Môi trường',
    scale: '20–40 thành viên',
    logoText: 'Green',
    logoColor: '#059669',
    status: 'pending_icpdp',
  },
];

const run = async () => {
  await connectDB();
  for (const sample of SAMPLES) {
    const exists = await ClubRegistration.findOne({
      clubName: sample.clubName,
      status: 'pending_icpdp',
    });
    if (exists) {
      console.log(`  Skip (exists): ${sample.clubName}`);
      continue;
    }
    await ClubRegistration.create({
      ...sample,
      submittedByEmail: sample.presidentEmail,
    });
    console.log(`  Added: ${sample.clubName}`);
  }
  const pending = await ClubRegistration.countDocuments({ status: 'pending_icpdp' });
  console.log(`\nTổng đơn chờ ICPDP: ${pending}`);
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
