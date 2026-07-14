const mongoose = require('mongoose');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const Partner = require('../models/Partner');
const AppError = require('../utils/AppError');
const { formatEvent } = require('../utils/eventFormat');
const { uploadDataUri } = require('../utils/cloudinary');

const IMAGE_DATA_URI_RE = /^data:image\/[a-z0-9.+-]+;base64,/i;
const MAX_PROOF_LEN = 8_000_000; // ~6MB ảnh base64

// Giới hạn tần suất đối tác gửi yêu cầu tất toán: tối đa 3 lần/ngày, mỗi lần cách nhau ≥ 1 giờ.
const MAX_REQUESTS_PER_DAY = 3;
const MIN_GAP_MS = 60 * 60 * 1000;

const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
};

// Tổng tiền vé đã thanh toán thật (Payment.status = 'paid') của một sự kiện.
const computeEventPaidRevenue = async (eventId) => {
  const oid = toObjectId(eventId);
  if (!oid) return { paidRevenue: 0, paidCount: 0 };
  const agg = await Payment.aggregate([
    { $match: { event: oid, status: 'paid' } },
    {
      $group: {
        _id: null,
        paidRevenue: { $sum: { $ifNull: ['$paidAmount', 0] } },
        paidCount: { $sum: 1 },
      },
    },
  ]);
  return { paidRevenue: agg[0]?.paidRevenue || 0, paidCount: agg[0]?.paidCount || 0 };
};

// Bản đồ doanh thu theo nhiều sự kiện (dùng cho danh sách).
const computePaidRevenueMap = async (eventIds = []) => {
  const oids = eventIds.map(toObjectId).filter(Boolean);
  const map = {};
  if (!oids.length) return map;
  const agg = await Payment.aggregate([
    { $match: { event: { $in: oids }, status: 'paid' } },
    {
      $group: {
        _id: '$event',
        paidRevenue: { $sum: { $ifNull: ['$paidAmount', 0] } },
        paidCount: { $sum: 1 },
      },
    },
  ]);
  agg.forEach((row) => {
    map[String(row._id)] = { paidRevenue: row.paidRevenue || 0, paidCount: row.paidCount || 0 };
  });
  return map;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Đánh giá xem đối tác có được gửi yêu cầu tất toán vào lúc này không.
const evaluateRequestAllowance = (requestLog = []) => {
  const today0 = startOfToday();
  const logs = (requestLog || [])
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);
  const todayLogs = logs.filter((d) => d >= today0);
  const usedToday = todayLogs.length;
  const remainingToday = Math.max(0, MAX_REQUESTS_PER_DAY - usedToday);
  const last = logs[logs.length - 1] || null;

  if (usedToday >= MAX_REQUESTS_PER_DAY) {
    return { allowed: false, reason: 'daily_limit', remainingToday: 0, nextAllowedAt: null, usedToday };
  }
  if (last && Date.now() - last.getTime() < MIN_GAP_MS) {
    return {
      allowed: false,
      reason: 'cooldown',
      remainingToday,
      nextAllowedAt: new Date(last.getTime() + MIN_GAP_MS),
      usedToday,
    };
  }
  return { allowed: true, reason: null, remainingToday, nextAllowedAt: null, usedToday };
};

// Sự kiện đã kết thúc chưa? (theo status 'ended', eventState 'expired', hoặc endDate đã qua)
const isEventEnded = (event) => {
  if (!event) return false;
  if (event.status === 'ended') return true;
  if (event.eventState === 'expired') return true;
  if (event.endDate && new Date(event.endDate).getTime() <= Date.now()) return true;
  return false;
};

const hasBankInfo = (partner) =>
  Boolean(partner && partner.bankAccountNumber && partner.bankCode && partner.bankAccountHolder);

const bankSummary = (partner) => ({
  bankAccountNumber: partner?.bankAccountNumber || '',
  bankCode: partner?.bankCode || '',
  bankName: partner?.bankName || '',
  bankAccountHolder: partner?.bankAccountHolder || '',
  hasBankInfo: hasBankInfo(partner),
});

// ---- Admin: danh sách tất toán sự kiện đối tác (mọi sự kiện partner, kể cả miễn phí) ----
const listAdminPartnerSettlements = async () => {
  const events = await Event.find({ source: 'partner', isDeleted: { $ne: true } })
    .select(
      'title startDate endDate status source partnerId ticketPrice registeredCount settlement'
    )
    .populate('partnerId', 'name email bankAccountNumber bankCode bankName bankAccountHolder')
    .sort({ startDate: -1 })
    .lean();

  const revenueMap = await computePaidRevenueMap(events.map((e) => e._id));

  const statusRank = { requested: 0, none: 1, paid: 2 };
  const items = events.map((e) => {
    const revenue = revenueMap[String(e._id)] || { paidRevenue: 0, paidCount: 0 };
    const partner = e.partnerId || null;
    const settlement = e.settlement || {};
    return {
      id: String(e._id),
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      statusKey: e.status,
      partnerId: partner?._id ? String(partner._id) : null,
      partnerName: partner?.name || '',
      ticketPrice: e.ticketPrice || 0,
      registeredCount: e.registeredCount || 0,
      paidRevenue: revenue.paidRevenue,
      paidCount: revenue.paidCount,
      settlementStatus: settlement.status || 'none',
      settlementRequestedAt: settlement.requestedAt || null,
      settlementPaidAt: settlement.paidAt || null,
      settlementPaidAmount: settlement.paidAmount || 0,
      ...bankSummary(partner),
    };
  });

  items.sort((a, b) => {
    const r = (statusRank[a.settlementStatus] ?? 1) - (statusRank[b.settlementStatus] ?? 1);
    if (r !== 0) return r;
    return new Date(b.startDate || 0) - new Date(a.startDate || 0);
  });
  return items;
};

// ---- Admin: chi tiết một sự kiện đối tác để tất toán ----
const getAdminPartnerSettlementDetail = async (eventId) => {
  const event = await Event.findById(eventId).lean();
  if (!event || event.source !== 'partner') {
    throw new AppError('Không tìm thấy sự kiện đối tác!', 404);
  }
  const partner = event.partnerId
    ? await Partner.findById(event.partnerId)
        .select('name email phone representative bankAccountNumber bankCode bankName bankAccountHolder')
        .lean()
    : null;
  const revenue = await computeEventPaidRevenue(event._id);

  return {
    event: formatEvent(event),
    partner: partner
      ? {
          id: String(partner._id),
          name: partner.name || '',
          email: partner.email || '',
          phone: partner.phone || '',
          representative: partner.representative || '',
          ...bankSummary(partner),
        }
      : null,
    revenue,
    settlement: {
      status: event.settlement?.status || 'none',
      requestedAt: event.settlement?.requestedAt || null,
      paidAt: event.settlement?.paidAt || null,
      paidByEmail: event.settlement?.paidByEmail || '',
      paidAmount: event.settlement?.paidAmount || 0,
      note: event.settlement?.note || '',
      proofUrl: event.settlement?.proofUrl || '',
      proofAiChecked: event.settlement?.proofAiChecked || false,
      proofAiValid: event.settlement?.proofAiValid || false,
      proofAiReason: event.settlement?.proofAiReason || '',
      proofAdminOverride: event.settlement?.proofAdminOverride || false,
    },
  };
};

// ---- Admin: AI trích & kiểm tra biên lai (KHÔNG xét số tiền — số tiền do FE so bằng code) ----
// AI chỉ chạy 1 lần cho mỗi biên lai; khớp số tiền tính phía client để đổi số tiền không tốn token.
const analyzeSettlementProof = async ({ eventId, proofImage }) => {
  const proof = String(proofImage || '');
  if (!IMAGE_DATA_URI_RE.test(proof)) {
    throw new AppError('Ảnh biên lai không hợp lệ (chỉ nhận ảnh PNG/JPG).', 400);
  }
  const event = await Event.findById(eventId).select('source partnerId title').lean();
  if (!event || event.source !== 'partner') {
    throw new AppError('Không tìm thấy sự kiện đối tác!', 404);
  }
  const partner = event.partnerId
    ? await Partner.findById(event.partnerId)
        .select('bankAccountNumber bankCode bankName bankAccountHolder')
        .lean()
    : null;
  if (!hasBankInfo(partner)) {
    throw new AppError('Đối tác chưa cập nhật thông tin ngân hàng.', 400);
  }

  const bankLabel = partner.bankName || partner.bankCode || '';
  const systemPrompt =
    'Bạn là trợ lý kiểm tra biên lai/xác nhận chuyển tiền của Việt Nam. ' +
    'Biên lai hợp lệ bao gồm cả biên lai chuyển khoản ngân hàng LẪN màn hình xác nhận giao dịch chuyển tiền thành công của ví điện tử hoặc app ngân hàng (ví dụ ZaloPay, MoMo, VNPay, Internet Banking...). ' +
    'Nhiệm vụ: đọc thông tin NGƯỜI NHẬN trong ảnh và đối chiếu với thông tin kỳ vọng. KHÔNG cần xét số tiền có đúng hay không (việc đó do hệ thống tự so), chỉ cần đọc chính xác số tiền ra. ' +
    'Chỉ dựa vào nội dung nhìn thấy trong ảnh, KHÔNG bịa thêm.\n\n' +
    'Quy tắc đối chiếu QUAN TRỌNG:\n' +
    '1. Tên ngân hàng ở Việt Nam có nhiều cách viết (tên đầy đủ, tên viết tắt, mã BIN). Hãy coi các cách viết cùng chỉ một ngân hàng là KHỚP. ' +
    'Ví dụ: "Ngân hàng TMCP Quân Đội" = "MB Bank" = "MBBank" = "MB"; "Vietcombank" = "Ngân hàng TMCP Ngoại thương Việt Nam" = "VCB"; "Techcombank" = "TCB"; "Ngân hàng TMCP Á Châu" = "ACB". Bỏ qua chữ hoa/thường, dấu, khoảng trắng.\n' +
    '2. Nhiều biên lai ví điện tử KHÔNG hiển thị số tài khoản người nhận mà chỉ hiển thị TÊN người nhận và ngân hàng. Trong trường hợp đó, đừng đánh trượt chỉ vì thiếu số tài khoản — hãy dựa vào TÊN người nhận và ngân hàng để xác định đúng người.\n' +
    '3. Số tiền: bỏ qua dấu chấm/phẩy phân tách và dấu trừ (chuyển đi thường hiển thị số âm). "-10.000đ" nghĩa là 10000 VND.\n' +
    '4. Tên chủ tài khoản: khớp nếu trùng khi bỏ dấu và chữ hoa/thường (ví dụ "TRAN XUAN THUAN" khớp "Trần Xuân Thuận").';
  const userPrompt =
    `Thông tin người NHẬN kỳ vọng:\n` +
    `- Số tài khoản người nhận: ${partner.bankAccountNumber}\n` +
    `- Ngân hàng người nhận: ${bankLabel}\n` +
    `- Tên chủ tài khoản: ${partner.bankAccountHolder}\n\n` +
    `Hãy trích thông tin người nhận trong ảnh rồi so khớp.\n` +
    `Trả về JSON với các trường:\n` +
    `recipientValid (boolean): true nếu ảnh là biên lai/xác nhận chuyển tiền THÀNH CÔNG và người nhận khớp kỳ vọng. ` +
    `Coi là khớp khi: số tài khoản khớp HOẶC tên người nhận khớp, với ngân hàng không mâu thuẫn. ` +
    `Không cần cả ba yếu tố đều khớp; đặc biệt được phép thiếu số tài khoản nếu tên người nhận và ngân hàng đã khớp. KHÔNG xét số tiền ở đây.\n` +
    `matchedAccount (boolean), matchedHolder (boolean: tên người nhận khớp), matchedBank (boolean),\n` +
    `extractedAccount (string), extractedHolder (string), extractedAmount (number|null: số tiền đọc được, VND), extractedBank (string),\n` +
    `reason (string tiếng Việt, ngắn gọn nêu vì sao người nhận hợp lệ hoặc không).`;

  const { analyzeImageJson } = require('./aiProvider.service');
  let verdict;
  try {
    verdict = await analyzeImageJson({ systemPrompt, userPrompt, imageDataUri: proof, temperature: 0.1 });
  } catch (err) {
    console.error('[Settlement] AI analyze error:', err.message);
    throw new AppError('Không phân tích được biên lai bằng AI. Bạn vẫn có thể tự xác nhận để tất toán.', 502);
  }

  const extractedAmount =
    verdict.extractedAmount == null || Number.isNaN(Number(verdict.extractedAmount))
      ? null
      : Math.abs(Number(verdict.extractedAmount));

  return {
    recipientValid: Boolean(verdict.recipientValid),
    matchedAccount: Boolean(verdict.matchedAccount),
    matchedHolder: Boolean(verdict.matchedHolder),
    matchedBank: Boolean(verdict.matchedBank),
    extractedAccount: String(verdict.extractedAccount || ''),
    extractedHolder: String(verdict.extractedHolder || ''),
    extractedAmount,
    extractedBank: String(verdict.extractedBank || ''),
    reason: String(verdict.reason || ''),
  };
};

// ---- Admin: xác nhận tất toán cho đối tác ----
const settlePartnerEvent = async ({
  eventId,
  amount,
  note = '',
  proofImage = '',
  aiValid = null,
  aiReason = '',
  adminOverride = false,
  adminEmail = '',
}) => {
  const event = await Event.findById(eventId);
  if (!event || event.source !== 'partner') {
    throw new AppError('Không tìm thấy sự kiện đối tác!', 404);
  }
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount < 0) {
    throw new AppError('Số tiền tất toán không hợp lệ!', 400);
  }

  const partner = event.partnerId
    ? await Partner.findById(event.partnerId)
        .select('name email bankAccountNumber bankCode bankName bankAccountHolder')
        .lean()
    : null;
  if (!hasBankInfo(partner)) {
    throw new AppError('Đối tác chưa cập nhật thông tin ngân hàng để tất toán!', 400);
  }

  // Bắt buộc đính kèm ảnh biên lai chuyển khoản (bill).
  const proof = String(proofImage || '');
  if (!proof) {
    throw new AppError('Vui lòng đính kèm ảnh biên lai chuyển khoản để tất toán.', 400);
  }
  if (!IMAGE_DATA_URI_RE.test(proof)) {
    throw new AppError('Ảnh biên lai không hợp lệ (chỉ nhận ảnh PNG/JPG).', 400);
  }
  if (proof.length > MAX_PROOF_LEN) {
    throw new AppError('Ảnh biên lai quá lớn. Vui lòng chọn ảnh nhỏ hơn.', 413);
  }

  let proofUrl = '';
  let proofPublicId = '';
  try {
    const uploaded = await uploadDataUri(proof, {
      folder: 'fevents/settlement-proofs',
      publicId: `settlement-${event._id}`,
    });
    if (uploaded) {
      proofUrl = uploaded.url;
      proofPublicId = uploaded.publicId;
    } else {
      // Cloudinary chưa cấu hình (dev) → lưu tạm data URI để không mất bằng chứng.
      proofUrl = proof;
    }
  } catch (err) {
    console.error('[Settlement] upload proof error:', err.message);
    throw new AppError('Không tải được ảnh biên lai. Vui lòng thử lại.', 502);
  }

  const aiChecked = aiValid !== null && aiValid !== undefined;
  event.settlement = {
    ...(event.settlement || {}),
    status: 'paid',
    paidAt: new Date(),
    paidByEmail: adminEmail,
    paidAmount: numAmount,
    note: String(note || ''),
    proofUrl,
    proofPublicId,
    proofAiChecked: aiChecked,
    proofAiValid: aiChecked ? Boolean(aiValid) : false,
    proofAiReason: String(aiReason || ''),
    proofAdminOverride: Boolean(adminOverride),
  };
  await event.save();

  // Thông báo + email cho đối tác (không chặn luồng).
  try {
    const { createAndBroadcast } = require('./notification.service');
    createAndBroadcast({
      recipientEmails: partner.email ? [partner.email] : [],
      recipientRoles: [],
      title: 'Trường đã tất toán doanh thu',
      body: `Nhà trường đã tất toán ${numAmount.toLocaleString('vi-VN')} đ cho sự kiện "${event.title}".`,
      type: 'partner_settlement',
      refId: String(event._id),
      refType: 'partner_settlement',
    });
  } catch (err) {
    console.error('[Settlement] notify partner error:', err.message);
  }
  if (partner.email) {
    try {
      const { sendPartnerSettlementPaidEmail } = require('./email.service');
      sendPartnerSettlementPaidEmail({
        to: partner.email,
        partnerName: partner.name,
        eventTitle: event.title,
        amount: numAmount,
        note,
      }).catch((err) => console.error('[Settlement] paid email error:', err.message));
    } catch (err) {
      console.error('[Settlement] paid email error:', err.message);
    }
  }

  return getAdminPartnerSettlementDetail(event._id);
};

const countRequestedSettlements = () =>
  Event.countDocuments({ source: 'partner', 'settlement.status': 'requested', isDeleted: { $ne: true } });

module.exports = {
  MAX_REQUESTS_PER_DAY,
  MIN_GAP_MS,
  computeEventPaidRevenue,
  computePaidRevenueMap,
  evaluateRequestAllowance,
  isEventEnded,
  hasBankInfo,
  bankSummary,
  listAdminPartnerSettlements,
  getAdminPartnerSettlementDetail,
  analyzeSettlementProof,
  settlePartnerEvent,
  countRequestedSettlements,
};
