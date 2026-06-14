require('dotenv').config();

const connectDB = require('../src/config/db');
const Event = require('../src/models/Event');
const Club = require('../src/models/Club');
const User = require('../src/models/User');
const { EVENT_CAMPUS } = require('../src/constants/eventVenues');

const TITLE = 'Career Fair: Kết nối doanh nghiệp';

const upsertCareerFair = async () => {
  await connectDB();

  const club = await Club.findOne({ slug: 'dreamteam' });
  if (!club) {
    console.error('Không tìm thấy CLB dreamteam.');
    process.exit(1);
  }

  let creator = await User.findOne({ role: { $in: ['ctsv', 'club_manager', 'staff'] } });
  if (!creator) creator = await User.findOne();

  const payload = {
    title: TITLE,
    description:
      'Ngày hội việc làm và kết nối doanh nghiệp dành cho sinh viên FPT — gặp gỡ nhà tuyển dụng, workshop CV và phỏng vấn thử.',
    thumbnail:
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
    category: 'Kinh tế',
    startDate: new Date('2026-05-28T08:00:00+07:00'),
    endDate: new Date('2026-05-28T17:00:00+07:00'),
    campus: EVENT_CAMPUS,
    location: 'Sảnh tòa Gamma',
    capacity: 300,
    registeredCount: 42,
    status: 'approved',
    eventState: 'active',
    ticketPrice: 0,
    clubId: club._id,
    source: 'club',
    createdBy: creator?._id,
  };

  const existing = await Event.findOne({ title: TITLE });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    console.log(`Đã cập nhật sự kiện: ${existing._id}`);
  } else {
    const created = await Event.create(payload);
    console.log(`Đã tạo sự kiện: ${created._id}`);
  }

  process.exit(0);
};

upsertCareerFair().catch((err) => {
  console.error(err);
  process.exit(1);
});
