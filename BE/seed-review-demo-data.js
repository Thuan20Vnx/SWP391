/**
 * Seed đánh giá cho các sự kiện đã kết thúc, dùng tài khoản sinh viên sẵn có
 * trong hệ thống. Chỉ tài khoản đã check-in + check-out (status 'attended')
 * mới được tạo đánh giá — mô phỏng đúng luồng điểm danh thật (qrScanner.service.js).
 *
 * Idempotent: bỏ qua nếu user đã có review cho event đó (unique index user+event).
 * Không đụng tới đăng ký/đánh giá của tài khoản nào ngoài danh sách STUDENT_EMAILS.
 *
 * Chạy: node seed-review-demo-data.js
 */
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const Event = require('./src/models/Event');
const EventRegistration = require('./src/models/EventRegistration');
const EventReview = require('./src/models/EventReview');
const User = require('./src/models/User');

const STUDENT_EMAILS = [
  'nhatlinh@gmail.com',
  'nhatlink888@gmail.com',
  'kxnhan1507@gmail.com',
  'tranxuanthuan443@gmail.com',
  'tranxuanthuan888@gmail.com',
  'student@gmail.com',
  'club@gmail.com',
];

const MIN_REVIEWERS_PER_EVENT = 3;

const COMMENTS = {
  5: [
    'Sự kiện tổ chức rất chuyên nghiệp, nội dung hữu ích và đội ngũ hỗ trợ nhiệt tình!',
    'Trải nghiệm tuyệt vời, mình học được nhiều điều mới và sẽ tiếp tục theo dõi các sự kiện sau.',
    'Chương trình chỉn chu từ khâu đón tiếp đến nội dung, rất đáng tham gia.',
  ],
  4: [
    'Nội dung hay, tổ chức khá tốt, chỉ tiếc thời gian hơi ngắn.',
    'Sự kiện bổ ích, diễn giả nhiệt tình, mong lần sau có thêm phần hỏi đáp.',
    'Không gian tổ chức ổn, chương trình đúng như kỳ vọng.',
  ],
  3: [
    'Nội dung ổn nhưng phần âm thanh chưa tốt lắm.',
    'Sự kiện bình thường, có thể cải thiện thêm phần tương tác.',
    'Cũng tạm được, hy vọng lần sau chỉn chu hơn về giờ giấc.',
  ],
  2: [
    'Chương trình bắt đầu trễ so với lịch, hơi ảnh hưởng trải nghiệm.',
    'Nội dung chưa thực sự sát với những gì quảng bá trước đó.',
  ],
  1: [
    'Khá thất vọng vì công tác tổ chức còn nhiều thiếu sót.',
  ],
};

// Trải sao theo tỉ lệ thiên về tích cực nhưng vẫn có biến thiên thực tế.
const RATING_CYCLE = [5, 4, 5, 3, 4, 5, 4, 2, 5, 3, 4, 5, 4, 3, 1];

const pick = (arr, seed) => arr[seed % arr.length];

const sessionKeyFor = (date) => new Date(date).toISOString().slice(0, 10);

const ensureCheckedOut = async (registration, event) => {
  const now = new Date();
  const checkinAt = event.endDate ? new Date(new Date(event.endDate).getTime() - 60 * 60 * 1000) : now;
  const checkoutAt = event.endDate ? new Date(event.endDate) : now;
  const key = sessionKeyFor(checkoutAt);

  let changed = false;
  if (registration.status !== 'attended') {
    registration.status = 'attended';
    changed = true;
  }
  if (!registration.checkedInAt) {
    registration.checkedInAt = checkinAt;
    changed = true;
  }
  if (!registration.checkedOutAt) {
    registration.checkedOutAt = checkoutAt;
    changed = true;
  }
  const hasSession = (registration.attendanceLog || []).some((s) => s.sessionKey === key);
  if (!hasSession) {
    registration.attendanceLog.push({ sessionKey: key, checkedInAt: checkinAt, checkedOutAt: checkoutAt });
    registration.markModified('attendanceLog');
    changed = true;
  }
  if (changed) await registration.save();
  return registration;
};

const updateEventRatingStats = async (eventId) => {
  const stats = await EventReview.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(String(eventId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = stats[0]?.avg ?? 0;
  const count = stats[0]?.count ?? 0;
  await Event.findByIdAndUpdate(eventId, {
    averageRating: Math.round(avg * 10) / 10,
    reviewCount: count,
  });
};

const main = async () => {
  await connectDB();

  const students = await User.find({ email: { $in: STUDENT_EMAILS } }).select('_id email fullname').lean();
  if (!students.length) {
    throw new Error('Không tìm thấy tài khoản sinh viên nào trong STUDENT_EMAILS.');
  }

  const now = new Date();
  const endedEvents = await Event.find({
    $or: [
      { status: 'ended' },
      { endDate: { $lt: now }, status: { $in: ['approved', 'live', 'ended'] } },
    ],
  }).select('title category endDate totalTickets').lean();

  let reviewsAdded = 0;
  let registrationsCreated = 0;
  let checkoutsSimulated = 0;
  const touchedEventIds = new Set();

  for (const event of endedEvents) {
    const existingRegs = await EventRegistration.find({
      event: event._id,
      user: { $in: students.map((s) => s._id) },
      status: { $ne: 'cancelled' },
    });

    const registeredUserIds = new Set(existingRegs.map((r) => String(r.user)));
    const missingCount = Math.max(0, MIN_REVIEWERS_PER_EVENT - existingRegs.length);
    const candidates = students.filter((s) => !registeredUserIds.has(String(s._id))).slice(0, missingCount);

    const newRegs = [];
    for (const student of candidates) {
      const reg = await EventRegistration.create({
        user: student._id,
        event: event._id,
        status: 'registered',
        registeredAt: new Date(new Date(event.endDate).getTime() - 7 * 24 * 60 * 60 * 1000),
      });
      newRegs.push(reg);
      registrationsCreated += 1;
    }

    const allRegs = [...existingRegs, ...newRegs];
    if (!allRegs.length) continue;

    let ratingSeed = 0;
    for (const reg of allRegs) {
      const alreadyCheckedOut = Boolean(reg.checkedOutAt);
      await ensureCheckedOut(reg, event);
      if (!alreadyCheckedOut) checkoutsSimulated += 1;

      const existingReview = await EventReview.findOne({ user: reg.user, event: event._id });
      if (existingReview) continue;

      const rating = pick(RATING_CYCLE, ratingSeed + String(event._id).charCodeAt(0));
      const comment = pick(COMMENTS[rating], ratingSeed);
      await EventReview.create({
        user: reg.user,
        event: event._id,
        rating,
        comment,
      });
      reviewsAdded += 1;
      touchedEventIds.add(String(event._id));
      ratingSeed += 1;
    }
  }

  for (const eventId of touchedEventIds) {
    await updateEventRatingStats(eventId);
  }

  console.log('====================================');
  console.log('Seed review demo data complete.');
  console.log(`Sự kiện đã xét: ${endedEvents.length}`);
  console.log(`Đăng ký mới tạo: ${registrationsCreated}`);
  console.log(`Check-in/out mô phỏng: ${checkoutsSimulated}`);
  console.log(`Review mới thêm: ${reviewsAdded}`);
  console.log(`Sự kiện được cập nhật rating: ${touchedEventIds.size}`);
  console.log('====================================');
};

main()
  .catch((error) => {
    console.error('seed-review-demo-data error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close(false).catch(() => {});
  });
