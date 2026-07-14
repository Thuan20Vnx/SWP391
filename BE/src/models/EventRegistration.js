const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  status: {
    type: String,
    enum: ['registered', 'cancelled', 'attended'],
    default: 'registered',
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  // Mốc check-in/out tổng hợp: lần check-in ĐẦU và lần check-out CUỐI (giữ tương thích ngược).
  checkedInAt: {
    type: Date,
    default: null,
  },
  checkedOutAt: {
    type: Date,
    default: null,
  },
  // Điểm danh theo từng ngày cho sự kiện nhiều ngày. sessionKey = 'YYYY-MM-DD' (theo ngày quét).
  attendanceLog: {
    type: [
      new mongoose.Schema(
        {
          sessionKey: { type: String, required: true },
          checkedInAt: { type: Date, default: null },
          checkedOutAt: { type: Date, default: null },
        },
        { _id: false },
      ),
    ],
    default: [],
  },
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  googleCalendarEventId: {
    type: String,
    default: null,
  },
  listPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0,
  },
  studentPrivilegeApplied: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

eventRegistrationSchema.index({ user: 1, event: 1 }, { unique: true });
eventRegistrationSchema.index({ user: 1, status: 1 });
eventRegistrationSchema.index({ event: 1, status: 1 });
eventRegistrationSchema.index({ event: 1, registeredAt: -1 });

const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema);

module.exports = EventRegistration;
