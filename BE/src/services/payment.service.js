const crypto = require('crypto');
const Payment = require('../models/Payment');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { getPaymentSettings } = require('./systemSettings.service');
const {
  calculateTicketAmount,
  getListPrice,
  formatVnd,
} = require('../constants/eventPricing');
const { isEventPubliclyVisible } = require('../constants/eventWorkflow');
const { syncEventToGoogleCalendar } = require('./calendar.service');
const { sendPaymentConfirmationEmail } = require('./email.service');

const QR_BASE = 'https://qr.sepay.vn/img';

const buildQrUrl = (settings, amount, code) => {
  const params = new URLSearchParams({
    acc: settings.accountNumber,
    bank: settings.bankCode,
    amount: String(amount),
    des: code,
  });
  return `${QR_BASE}?${params.toString()}`;
};

const generateCode = () =>
  `FEVT${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const generateUniqueCode = async () => {
  for (let i = 0; i < 6; i += 1) {
    const code = generateCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Payment.exists({ code });
    if (!exists) return code;
  }
  throw new AppError('Không tạo được mã thanh toán, vui lòng thử lại.', 500);
};

const assertPaymentEnabled = (settings) => {
  if (!settings.enabled) {
    throw new AppError('Thanh toán trực tuyến đang tắt. Vui lòng liên hệ ban tổ chức.', 503);
  }
  if (!settings.accountNumber || !settings.bankCode) {
    throw new AppError('Cấu hình thanh toán chưa hoàn tất.', 503);
  }
};

const buildPaymentView = (payment, settings) => ({
  code: payment.code,
  status: payment.status,
  amount: payment.amount,
  amountLabel: formatVnd(payment.amount),
  eventId: String(payment.event),
  expiresAt: payment.expiresAt,
  paidAt: payment.paidAt,
  qrUrl: buildQrUrl(settings, payment.amount, payment.code),
  transferContent: payment.code,
  bank: {
    accountNumber: settings.accountNumber,
    bankCode: settings.bankCode,
    accountHolder: settings.accountHolder || '',
  },
});

/**
 * Tạo đơn thanh toán cho vé sự kiện có phí.
 * Chặn: chỉ tạo khi sự kiện mở đăng ký, còn chỗ, và user phải trả tiền (amountDue > 0).
 */
const createEventTicketPayment = async (user, eventId) => {
  const settings = await getPaymentSettings();
  assertPaymentEnabled(settings);

  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Không tìm thấy sự kiện!', 404);
  if (!isEventPubliclyVisible(event)) throw new AppError('Sự kiện chưa được mở đăng ký.', 400);
  if (event.eventState === 'expired') throw new AppError('Sự kiện đã hết hạn đăng ký.', 400);
  if (event.eventState === 'postponed') throw new AppError('Sự kiện đang hoãn, chưa thể đăng ký.', 400);
  if (event.registrationStartDate) {
    const regStart = new Date(event.registrationStartDate);
    if (!Number.isNaN(regStart.getTime()) && Date.now() < regStart.getTime()) {
      throw new AppError('Sự kiện chưa tới ngày mở đăng ký.', 400);
    }
  }
  if (event.registrationEndDate) {
    const regEnd = new Date(event.registrationEndDate);
    if (!Number.isNaN(regEnd.getTime()) && Date.now() > regEnd.getTime()) {
      throw new AppError('Đã hết hạn đăng ký sự kiện.', 400);
    }
  }
  if (event.registeredCount >= event.capacity) throw new AppError('Sự kiện đã hết chỗ.', 400);

  const amount = calculateTicketAmount(user, event);
  if (amount <= 0) {
    throw new AppError('Vé này miễn phí với bạn — hãy dùng nút đăng ký thường.', 400);
  }

  const existingReg = await EventRegistration.findOne({ user: user._id, event: eventId });
  if (existingReg?.status === 'registered') {
    throw new AppError('Bạn đã đăng ký sự kiện này rồi.', 409);
  }

  // Tái dùng đơn pending còn hạn nếu có
  const now = Date.now();
  await Payment.updateMany(
    {
      user: user._id,
      event: eventId,
      status: 'pending',
      expiresAt: { $lte: new Date(now) },
    },
    { $set: { status: 'expired' } },
  );

  const pending = await Payment.findOne({
    user: user._id,
    event: eventId,
    status: 'pending',
    expiresAt: { $gt: new Date(now) },
  });
  if (pending) {
    return buildPaymentView(pending, settings);
  }

  const code = await generateUniqueCode();
  const expiresAt = new Date(now + (Number(settings.expireMinutes) || 15) * 60 * 1000);

  const payment = await Payment.create({
    code,
    orderType: 'event_ticket',
    event: eventId,
    user: user._id,
    userEmail: user.email || '',
    amount,
    status: 'pending',
    expiresAt,
  });

  return buildPaymentView(payment, settings);
};

const lazyExpire = async (payment) => {
  if (payment.status === 'pending' && payment.expiresAt && payment.expiresAt.getTime() < Date.now()) {
    payment.status = 'expired';
    await payment.save();
  }
  return payment;
};

const getPaymentStatus = async (code, user) => {
  const payment = await Payment.findOne({ code: String(code || '').toUpperCase() });
  if (!payment) throw new AppError('Không tìm thấy đơn thanh toán.', 404);
  if (user && String(payment.user) !== String(user._id)) {
    throw new AppError('Bạn không có quyền xem đơn này.', 403);
  }
  await lazyExpire(payment);
  return {
    code: payment.code,
    status: payment.status,
    amount: payment.amount,
    paidAt: payment.paidAt,
    expiresAt: payment.expiresAt,
    eventId: String(payment.event),
    registrationId: payment.registration ? String(payment.registration) : null,
  };
};

const cancelPayment = async (code, user) => {
  const payment = await Payment.findOne({ code: String(code || '').toUpperCase() });
  if (!payment) throw new AppError('Không tìm thấy đơn thanh toán.', 404);
  if (user && String(payment.user) !== String(user._id)) {
    throw new AppError('Bạn không có quyền hủy đơn này.', 403);
  }
  if (payment.status === 'paid') {
    throw new AppError('Đơn đã thanh toán, không thể hủy.', 400);
  }
  if (payment.status === 'pending') {
    payment.status = 'cancelled';
    await payment.save();
  }
  return { code: payment.code, status: payment.status };
};

/**
 * Hoàn tất đăng ký sau khi đã nhận tiền (gọi từ webhook).
 */
const finalizePaidRegistration = async (payment) => {
  const event = await Event.findById(payment.event);
  if (!event) return null;

  let registration = await EventRegistration.findOne({ user: payment.user, event: payment.event });
  const fields = {
    listPrice: getListPrice(event),
    amountPaid: payment.amount,
    studentPrivilegeApplied: false,
    status: 'registered',
  };

  if (registration) {
    if (registration.status !== 'registered') {
      registration.cancelledAt = null;
      registration.registeredAt = new Date();
      Object.assign(registration, fields);
      await registration.save();
      event.registeredCount = Math.min(event.registeredCount + 1, event.capacity);
      await event.save();
    }
  } else {
    registration = await EventRegistration.create({
      user: payment.user,
      event: payment.event,
      registeredAt: new Date(),
      ...fields,
    });
    event.registeredCount = Math.min(event.registeredCount + 1, event.capacity);
    await event.save();
  }

  // Đồng bộ Google Calendar (không chặn nếu lỗi)
  try {
    const gcalId = await syncEventToGoogleCalendar(payment.user, event);
    if (gcalId && registration.googleCalendarEventId !== gcalId) {
      registration.googleCalendarEventId = gcalId;
      await registration.save();
    }
  } catch (err) {
    console.warn('[Payment] sync calendar skipped:', err.message);
  }

  return registration;
};

const normalizeContent = (text) => String(text || '').toUpperCase().replace(/\s+/g, '');

/**
 * Xử lý webhook SePay. Trả về { matched, paid } để controller phản hồi 200.
 * Không throw cho trường hợp không khớp (để SePay không retry vô hạn).
 */
const handleSepayWebhook = async (payload = {}) => {
  // Chỉ quan tâm tiền vào
  if (payload.transferType && payload.transferType !== 'in') {
    return { matched: false, reason: 'not_incoming' };
  }

  const sepayTxId = Number(payload.id) || null;

  // Dedup: nếu đã xử lý giao dịch SePay này rồi
  if (sepayTxId) {
    const already = await Payment.findOne({ sepayTxId });
    if (already) return { matched: true, paid: true, deduped: true, code: already.code };
  }

  // Tìm mã đơn trong content / code
  const haystack = `${normalizeContent(payload.code)} ${normalizeContent(payload.content)} ${normalizeContent(payload.description)}`;
  const codeMatch = haystack.match(/FEVT[0-9A-F]{8}/);
  if (!codeMatch) {
    return { matched: false, reason: 'no_code' };
  }
  const code = codeMatch[0];

  const payment = await Payment.findOne({ code });
  if (!payment) return { matched: false, reason: 'unknown_code', code };

  if (payment.status === 'paid') {
    return { matched: true, paid: true, deduped: true, code };
  }

  const amountIn = Number(payload.transferAmount) || 0;
  if (amountIn < payment.amount) {
    // Thiếu tiền — ghi nhận nhưng chưa hoàn tất
    return { matched: true, paid: false, reason: 'insufficient', code, expected: payment.amount, received: amountIn };
  }

  // Đánh dấu đã trả + hoàn tất đăng ký
  payment.status = 'paid';
  if (sepayTxId) payment.sepayTxId = sepayTxId;
  payment.gateway = String(payload.gateway || '');
  payment.referenceCode = String(payload.referenceCode || '');
  payment.paidAmount = amountIn;
  payment.paidAt = new Date();

  const registration = await finalizePaidRegistration(payment);
  if (registration) payment.registration = registration._id;
  await payment.save();

  // Gửi email xác nhận (nền, không chặn)
  try {
    const [evtDoc, userDoc] = await Promise.all([
      Event.findById(payment.event).lean(),
      User.findById(payment.user).lean(),
    ]);
    if (userDoc?.email && evtDoc?.title) {
      sendPaymentConfirmationEmail({
        to: userDoc.email,
        fullname: userDoc.fullname || userDoc.name || userDoc.email,
        eventTitle: evtDoc.title,
        amount: payment.amount,
        code: payment.code,
        paidAt: payment.paidAt,
      }).catch((err) => console.warn('[Payment] gửi email xác nhận thất bại:', err.message));
    }
  } catch (err) {
    console.warn('[Payment] gửi email xác nhận thất bại:', err.message);
  }

  return { matched: true, paid: true, code, registrationId: registration ? String(registration._id) : null };
};

/**
 * Lịch sử thanh toán của người dùng.
 */
const getUserPayments = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    Payment.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('event', 'title startDate location coverImage')
      .lean(),
    Payment.countDocuments({ user: userId }),
  ]);
  return { payments, total, page, limit };
};

/**
 * Admin: danh sách tất cả giao dịch + stats.
 */
const getAdminPayments = async ({ page = 1, limit = 30, status, eventId, search } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (eventId) filter.event = eventId;
  if (search) {
    filter.$or = [
      { code: { $regex: search.toUpperCase() } },
      { userEmail: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('event', 'title startDate')
      .populate('user', 'fullname email')
      .lean(),
    Payment.countDocuments(filter),
  ]);

  const [stats] = await Payment.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$paidAmount', 0] } },
        paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        refundRequested: { $sum: { $cond: [{ $eq: ['$refundStatus', 'requested'] }, 1, 0] } },
      },
    },
  ]);

  return { payments, total, page, limit, stats: stats || {} };
};

/**
 * Người dùng yêu cầu hoàn tiền.
 */
const requestRefund = async (code, user, reason = '') => {
  const payment = await Payment.findOne({ code: String(code || '').toUpperCase() });
  if (!payment) throw new AppError('Không tìm thấy đơn thanh toán.', 404);
  if (String(payment.user) !== String(user._id)) throw new AppError('Bạn không có quyền với đơn này.', 403);
  if (payment.status !== 'paid') throw new AppError('Chỉ đơn đã thanh toán mới được yêu cầu hoàn tiền.', 400);
  if (payment.refundStatus !== 'none') throw new AppError('Yêu cầu hoàn tiền đã được gửi trước đó.', 400);

  payment.refundStatus = 'requested';
  payment.refundReason = String(reason).trim().slice(0, 500);
  await payment.save();
  return { code: payment.code, refundStatus: payment.refundStatus };
};

/**
 * Admin duyệt/từ chối yêu cầu hoàn tiền.
 */
const processRefund = async (code, adminUser, action, note = '') => {
  if (!['approved', 'rejected'].includes(action)) throw new AppError('action phải là approved hoặc rejected.', 400);
  const payment = await Payment.findOne({ code: String(code || '').toUpperCase() });
  if (!payment) throw new AppError('Không tìm thấy đơn thanh toán.', 404);
  if (payment.refundStatus !== 'requested') throw new AppError('Đơn này chưa có yêu cầu hoàn tiền đang chờ.', 400);

  payment.refundStatus = action;
  payment.refundNote = String(note).trim().slice(0, 500);
  payment.refundAt = new Date();
  payment.refundBy = adminUser._id;
  await payment.save();
  return { code: payment.code, refundStatus: payment.refundStatus };
};

/**
 * Sửa index sepayTxId cũ (sparse unique + default null chỉ cho phép 1 đơn pending).
 * Gọi một lần khi khởi động server.
 */
const repairPaymentIndexes = async () => {
  const collection = Payment.collection;

  const unsetResult = await Payment.updateMany(
    { sepayTxId: null },
    { $unset: { sepayTxId: '' } },
  );
  if (unsetResult.modifiedCount > 0) {
    console.log(`[Payment] Đã gỡ sepayTxId=null trên ${unsetResult.modifiedCount} đơn cũ.`);
  }

  try {
    await collection.dropIndex('sepayTxId_1');
    console.log('[Payment] Đã xóa index sepayTxId cũ.');
  } catch (err) {
    if (err?.codeName !== 'IndexNotFound' && err?.code !== 27) {
      console.warn('[Payment] dropIndex sepayTxId:', err.message);
    }
  }

  await Payment.syncIndexes();
};

/**
 * Cron: hết hạn hàng loạt các đơn pending quá hạn.
 */
const expireStalePayments = async () => {
  const result = await Payment.updateMany(
    { status: 'pending', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } },
  );
  if (result.modifiedCount > 0) {
    console.log(`[Payment cron] Đã hết hạn ${result.modifiedCount} đơn pending.`);
  }
  return result.modifiedCount;
};

module.exports = {
  buildQrUrl,
  createEventTicketPayment,
  getPaymentStatus,
  cancelPayment,
  handleSepayWebhook,
  finalizePaidRegistration,
  getUserPayments,
  getAdminPayments,
  requestRefund,
  processRefund,
  expireStalePayments,
  repairPaymentIndexes,
};
