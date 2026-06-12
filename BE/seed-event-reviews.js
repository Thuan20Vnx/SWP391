/**
 * Code First — seed đăng ký + đánh giá sự kiện mẫu
 * Chạy: node seed-event-reviews.js  hoặc  npm run seed:reviews
 * (Cần chạy seed.js + seed-events.js trước)
 */
require('dotenv').config();

const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const EventRegistration = require('./src/models/EventRegistration');
const EventReview = require('./src/models/EventReview');

const STUDENT_EMAIL = 'sinhvienfpt@gmail.com';

const seedEventReviews = async () => {
  try {
    await connectDB();

    let student = await User.findOne({ email: STUDENT_EMAIL });
    if (!student) {
      student = await User.findOne({ role: 'student' });
    }
    if (!student) {
      console.error('❌ Không tìm thấy tài khoản sinh viên. Chạy `node seed.js` hoặc đăng ký sinh viên trước.');
      process.exit(1);
    }

    const techday = await Event.findOne({ title: 'FPT Techday 2024: Kiến tạo tương lai số' });
    const debate = await Event.findOne({ title: 'Workshop: Kỹ năng tranh biện (Debate)' });

    if (!techday || !debate) {
      console.error('❌ Không tìm thấy sự kiện seed. Chạy `npm run seed:events` trước.');
      process.exit(1);
    }

    await EventReview.deleteMany({ user: student._id });
    await EventRegistration.deleteMany({
      user: student._id,
      event: { $in: [techday._id, debate._id] },
    });

    await EventRegistration.create([
      {
        user: student._id,
        event: techday._id,
        status: 'attended',
        registeredAt: new Date('2024-10-20T10:00:00+07:00'),
      },
      {
        user: student._id,
        event: debate._id,
        status: 'attended',
        registeredAt: new Date('2024-05-05T10:00:00+07:00'),
      },
    ]);

    await EventReview.create({
      user: student._id,
      event: debate._id,
      rating: 5,
      comment: 'Nội dung thực tế, mentor nhiệt tình và có nhiều demo hay.',
    });

    await Event.findByIdAndUpdate(debate._id, { averageRating: 5, reviewCount: 1 });
    await Event.findByIdAndUpdate(techday._id, { averageRating: 0, reviewCount: 0 });

    console.log('====================================');
    console.log('✅ Code First: đã seed đánh giá sự kiện');
    console.log(`   Sinh viên: ${student.fullname} (${student.email})`);
    console.log(`   Chờ đánh giá: FPT Techday 2024`);
    console.log(`   Đã đánh giá: Workshop Debate (5 sao)`);
    console.log('====================================');

    process.exit(0);
  } catch (error) {
    console.error('Seed event reviews error:', error);
    process.exit(1);
  }
};

seedEventReviews();
