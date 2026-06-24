const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // Mã chuyển khoản (nội dung CK) — duy nhất, dùng để đối soát webhook
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    orderType: { type: String, enum: ['event_ticket'], default: 'event_ticket' },

    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, default: '', trim: true },

    amount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['pending', 'paid', 'expired', 'cancelled'],
      default: 'pending',
    },

    // Thông tin nhận về từ webhook SePay khi đã thanh toán (chỉ set khi có id thật — tránh xung đột unique index)
    sepayTxId: { type: Number },
    gateway: { type: String, default: '' }, // tên ngân hàng
    referenceCode: { type: String, default: '' },
    paidAmount: { type: Number, default: 0 },
    paidAt: { type: Date, default: null },

    // Liên kết tới bản ghi đăng ký sau khi hoàn tất
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'EventRegistration', default: null },

    expiresAt: { type: Date, required: true },

    // Hoàn tiền
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected'],
      default: 'none',
    },
    refundReason: { type: String, default: '' },
    refundNote: { type: String, default: '' },
    refundAt: { type: Date, default: null },
    refundBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ status: 1, expiresAt: 1 });
paymentSchema.index({ user: 1, event: 1, status: 1 });
paymentSchema.index(
  { sepayTxId: 1 },
  {
    unique: true,
    partialFilterExpression: { sepayTxId: { $type: 'number' } },
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
