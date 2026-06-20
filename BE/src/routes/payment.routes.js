const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorizeEventParticipant = require('../middleware/authorizeEventParticipant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const {
  createEventTicketPayment,
  getPaymentStatus,
  cancelPayment,
  getUserPayments,
  requestRefund,
} = require('../services/payment.service');

const router = express.Router();

router.use(authMiddleware);

// Resolve req.user từ authEmail (mọi role)
const resolveUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: String(req.authEmail || '').trim().toLowerCase() });
  if (!user) throw new AppError('Người dùng không tồn tại!', 401);
  req.user = user;
  next();
});

// Tạo đơn thanh toán vé sự kiện (mua vé có phí)
router.post(
  '/events/:id/checkout',
  authorizeEventParticipant,
  asyncHandler(async (req, res) => {
    const payment = await createEventTicketPayment(req.user, req.params.id);
    res.status(201).json({ success: true, payment });
  }),
);

// Kiểm tra trạng thái đơn (FE poll)
router.get(
  '/:code/status',
  asyncHandler(async (req, res) => {
    const status = await getPaymentStatus(req.params.code, req.user);
    res.json({ success: true, ...status });
  }),
);

// Hủy đơn pending
router.post(
  '/:code/cancel',
  asyncHandler(async (req, res) => {
    const result = await cancelPayment(req.params.code, req.user);
    res.json({ success: true, ...result });
  }),
);

// Lịch sử thanh toán của user đang đăng nhập
router.get(
  '/my',
  resolveUser,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const result = await getUserPayments(req.user._id, { page, limit });
    res.json({ success: true, ...result });
  }),
);

// Yêu cầu hoàn tiền
router.post(
  '/:code/refund-request',
  resolveUser,
  asyncHandler(async (req, res) => {
    const result = await requestRefund(req.params.code, req.user, req.body?.reason || '');
    res.json({ success: true, ...result });
  }),
);

module.exports = router;
