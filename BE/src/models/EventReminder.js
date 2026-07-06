const mongoose = require('mongoose');

/**
 * Đăng ký "nhắc tôi khi mở đăng ký" cho sinh viên/khách.
 * - sentSignup: đã gửi mail xác nhận đăng ký nhắc (ngay khi bấm nút).
 * - sentRegOpen: đã gửi mail nhắc trước khi mở đăng ký 5 phút.
 * - sentEventSoon: đã gửi mail "sắp diễn ra" trước giờ bắt đầu 6 tiếng.
 */
const eventReminderSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    fullname: { type: String, default: '' },

    // Snapshot mốc thời gian tại lúc đăng ký nhắc (dùng cho scheduler).
    registrationStartDate: { type: Date, default: null },
    eventStartDate: { type: Date, default: null },

    sentSignup: { type: Boolean, default: false },
    sentRegOpen: { type: Boolean, default: false },
    sentEventSoon: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventReminderSchema.index({ event: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('EventReminder', eventReminderSchema);
