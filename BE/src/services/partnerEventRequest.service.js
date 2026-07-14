const Partner = require('../models/Partner');
const PartnerEventRequest = require('../models/PartnerEventRequest');
const Contract = require('../models/Contract');
const AppError = require('../utils/AppError');
const { normalizeLearningOutcomes } = require('../utils/learningOutcomes');
const { assertEventScheduleDates } = require('../utils/dateValidation');
const partnerQueryCache = require('../utils/partnerQueryCache');
const { sanitizePartnerRequestForApi } = require('../utils/partnerMediaStorage');

const toRequestApi = (doc) => {
  const o = doc?.toObject ? doc.toObject() : { ...(doc || {}) };
  return { ...o, ...sanitizePartnerRequestForApi(o) };
};

const MAX_IMAGE_LEN = 4_500_000;
const MAX_ATTACHMENT_LEN = 2_000_000;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const bumpPartnerCache = (email) => partnerQueryCache.invalidateEmail(email);

const CANCELLED_SUMMARY_FIELDS =
  'title companyName status updatedAt createdAt submittedAt supplementReason expectedSponsorAmount category partnerId';

const assertImageField = (value, label) => {
  if (!value || typeof value !== 'string') return;
  if (value.length > MAX_IMAGE_LEN) {
    throw new AppError(`${label} quá lớn. Vui lòng nén ảnh trước khi lưu.`, 413);
  }
};

const sanitizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((a) => a && (a.name || a.url))
    .slice(0, 10)
    .map((a) => {
      const url = String(a.url || '').trim();
      if (url.length > MAX_ATTACHMENT_LEN) {
        throw new AppError(`File "${a.name || 'đính kèm'}" quá lớn.`, 413);
      }
      return {
        name: String(a.name || 'Tệp đính kèm').trim(),
        url,
        sizeLabel: String(a.sizeLabel || '').trim(),
        mimeType: String(a.mimeType || '').trim()
      };
    });
};

// Chuẩn hóa danh sách link đính kèm (URL http/https), tối đa 10 link.
const sanitizeAttachmentLinks = (links = []) => {
  if (!Array.isArray(links)) return [];
  return links
    .map((l) => String(l || '').trim())
    .filter((l) => /^https?:\/\/\S+$/i.test(l))
    .slice(0, 10);
};

const buildPayload = (body = {}) => {
  const ticketTypes = Array.isArray(body.ticketTypes)
    ? body.ticketTypes.map((t) => ({
        name: t.name || '',
        priceType: t.priceType === 'paid' ? 'paid' : 'free',
        priceAmount: Number(t.priceAmount) || 0,
        qty: Number(t.qty ?? t.quantity) || 0,
        quantity: Number(t.qty ?? t.quantity) || 0,
        audience: t.audience || 'SV FPT'
      }))
    : [];

  const speakers = Array.isArray(body.speakers)
    ? body.speakers.map((s) => ({
        name: s.name || '',
        role: s.role || '',
        avatar: s.avatar || ''
      }))
    : [];

  assertImageField(body.image, 'Ảnh bìa');
  speakers.forEach((s, i) => assertImageField(s.avatar, `Ảnh diễn giả ${i + 1}`));

  return {
    companyName: body.companyName?.trim() || body.name?.trim() || '',
    partnerCode: body.partnerCode?.trim() || '',
    representative: body.representative?.trim() || '',
    representativeTitle: body.representativeTitle?.trim() || '',
    phone: body.phone?.trim() || '',
    address: body.address?.trim() || '',
    category: body.category?.trim() || '',
    expectedSponsorAmount: Number(body.expectedSponsorAmount) || 0,
    benefits: Array.isArray(body.benefits) ? body.benefits.filter(Boolean) : [],
    partnerMessage: body.partnerMessage?.trim() || body.message?.trim() || '',
    attachments: sanitizeAttachments(body.attachments),
    attachmentLinks: sanitizeAttachmentLinks(body.attachmentLinks),
    title: body.title?.trim() || body.proposedEventTitle?.trim() || '',
    eventType: body.eventType?.trim() || 'Hội thảo & Workshop',
    description: body.description?.trim() || '',
    registrationStartDate: body.registrationStartDate ? new Date(body.registrationStartDate) : null,
    registrationEndDate: body.registrationEndDate ? new Date(body.registrationEndDate) : null,
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    duration: body.duration?.trim() || '',
    format: body.format || 'campus',
    location: body.location?.trim() || '',
    campus: body.campus?.trim() || '',
    agenda: body.agenda?.trim() || '',
    learningOutcomes: normalizeLearningOutcomes(body.learningOutcomes),
    expectedAttendees: Number(body.expectedAttendees) || 0,
    image: body.image || '',
    bannerFileName: body.bannerFileName?.trim() || '',
    totalTickets: Number(body.totalTickets) || 0,
    ticketTypes,
    speakers
  };
};

const getActiveRequestForEmail = async (email) => {
  const normalized = normalizeEmail(email);
  return PartnerEventRequest.findOne({
    partnerEmail: normalized,
    status: { $nin: ['cancelled', 'deleted'] }
  })
    .sort({ updatedAt: -1 })
    .lean();
};

// Trả về Mongoose document (KHÔNG .lean()) vì saveDraft/submitRequest cần .save().
const getDraftForEmail = async (email) => {
  const normalized = normalizeEmail(email);
  return PartnerEventRequest.findOne({
    partnerEmail: normalized,
    status: 'draft'
  }).sort({ updatedAt: -1 });
};

const getActiveEventRequestBundle = async (email) => {
  const normalized = normalizeEmail(email);
  const [request, cancelled] = await Promise.all([
    PartnerEventRequest.findOne({
      partnerEmail: normalized,
      status: { $nin: ['cancelled', 'deleted'] }
    })
      .sort({ updatedAt: -1 })
      .lean(),
    PartnerEventRequest.find({
      partnerEmail: normalized,
      status: 'cancelled'
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select(CANCELLED_SUMMARY_FIELDS)
      .lean()
  ]);

  let draft = null;
  if (request?.status === 'draft') {
    draft = request;
  } else {
    draft = await getDraftForEmail(normalized);
  }

  const activeRequest = request || draft || null;
  // Cờ khóa chỉnh sửa: nếu đơn đã gắn với sự kiện thật đã có người đăng ký / đã tất toán
  // thì đối tác không được gửi lại yêu cầu sửa. FE dùng cờ này để vô hiệu hóa nút.
  if (activeRequest?.eventId) {
    const Event = require('../models/Event');
    const ev = await Event.findById(activeRequest.eventId)
      .select('registeredCount settlement')
      .lean();
    if (ev) {
      if ((ev.registeredCount || 0) > 0) {
        activeRequest.editLock = 'registered';
        activeRequest.editLockReason = 'Sự kiện đã có người đăng ký nên không thể chỉnh sửa hay gửi lại yêu cầu.';
      } else if (ev.settlement?.status === 'paid') {
        activeRequest.editLock = 'settled';
        activeRequest.editLockReason = 'Sự kiện đã được tất toán nên không thể chỉnh sửa hay gửi lại yêu cầu.';
      }
    }
  }

  return {
    request: activeRequest,
    draft,
    cancelled
  };
};

const saveDraft = async (email, body) => {
  const normalized = normalizeEmail(email);
  const payload = buildPayload(body);
  let doc = await getDraftForEmail(normalized);
  if (!doc) {
    // Chỉ chặn khi còn đơn ĐANG trong luồng duyệt; đơn đã duyệt/ẩn là sự kiện đã hoàn tất
    // nên đối tác vẫn được tạo đơn (sự kiện) mới.
    const blocking = await PartnerEventRequest.findOne({
      partnerEmail: normalized,
      status: { $in: ['pending', 'info_requested'] }
    });
    if (blocking && blocking.status !== 'draft') {
      throw new AppError('Đã có yêu cầu sự kiện đang chờ duyệt. Vui lòng chờ CTSV xử lý trước khi tạo đơn mới.', 400);
    }
    doc = new PartnerEventRequest({ partnerEmail: normalized, status: 'draft' });
  }
  Object.assign(doc, payload, { status: 'draft' });
  await doc.save();
  bumpPartnerCache(normalized);
  return toRequestApi(doc);
};

const { ensurePrimaryPartnerMember } = require('./partnerMember.service');

const SELF_CANCEL_REASON = 'Đối tác đã hủy yêu cầu';

const syncPartnerRecord = async (email, payload, status = 'pending') => {
  const normalized = normalizeEmail(email);
  let partner = await Partner.findOne({ email: normalized }).sort({ updatedAt: -1, createdAt: -1 });
  const partnerData = {
    name: payload.companyName || payload.title || 'Đối tác',
    email: normalized,
    phone: payload.phone,
    representative: payload.representative,
    representativeTitle: payload.representativeTitle,
    address: payload.address,
    description: payload.description,
    partnerCode: payload.partnerCode,
    category: payload.category,
    proposedEventTitle: payload.title,
    expectedSponsorAmount: payload.expectedSponsorAmount,
    benefits: payload.benefits,
    attachments: payload.attachments,
    status
  };
  if (!partner) {
    partner = await Partner.create(partnerData);
    await Contract.create({
      partnerId: partner._id,
      title: payload.title || 'Sự kiện đối tác',
      amount: payload.expectedSponsorAmount || 0,
      status: 'pending'
    });
  } else {
    Object.assign(partner, partnerData, {
      status,
      rejectionReason: status === 'rejected' ? partner.rejectionReason || '' : '',
      supplementReason: status === 'pending' ? '' : partner.supplementReason
    });
    await partner.save();
    const contract = await Contract.findOne({ partnerId: partner._id }).sort({ createdAt: -1 });
    if (contract) {
      contract.title = payload.title || contract.title;
      contract.amount = payload.expectedSponsorAmount || contract.amount;
      await contract.save();
    }
  }
  await ensurePrimaryPartnerMember(partner);
  bumpPartnerCache(normalized);
  return partner;
};

const { assertNoVenueTimeConflict } = require('../utils/venueTimeConflict');

const submitRequest = async (email, body) => {
  const normalized = normalizeEmail(email);
  const payload = buildPayload(body);
  if (!payload.companyName) throw new AppError('Tên doanh nghiệp là bắt buộc!', 400);
  if (!payload.title) throw new AppError('Tên sự kiện là bắt buộc!', 400);
  if (!payload.registrationStartDate || Number.isNaN(payload.registrationStartDate.getTime())) {
    throw new AppError('Thời gian bắt đầu đăng ký là bắt buộc!', 400);
  }
  if (!payload.startDate || Number.isNaN(payload.startDate.getTime())) {
    throw new AppError('Thời gian bắt đầu sự kiện là bắt buộc!', 400);
  }
  assertEventScheduleDates({
    registrationStartDate: payload.registrationStartDate,
    startDate: payload.startDate,
  });

  // requestId tường minh = đối tác chủ động "Yêu cầu sửa" một đơn cụ thể → tái dùng
  // đơn đó (kể cả đã duyệt/ẩn) và gửi lại chờ CTSV duyệt, không tạo đơn trùng.
  const explicitDoc = body.requestId
    ? await PartnerEventRequest.findById(body.requestId)
    : null;
  if (body.requestId && (!explicitDoc || explicitDoc.partnerEmail !== normalized)) {
    throw new AppError('Không tìm thấy yêu cầu cần chỉnh sửa!', 404);
  }

  // Luồng ngầm (không có requestId): tái dùng nháp/bổ sung/bị từ chối; KHÔNG tái dùng
  // đơn đã duyệt/ẩn — tạo đơn MỚI chờ duyệt (tránh lỗi "đơn mới bị auto duyệt").
  let doc =
    explicitDoc ||
    (await getDraftForEmail(normalized)) ||
    (await PartnerEventRequest.findOne({
      partnerEmail: normalized,
      status: { $in: ['info_requested', 'rejected'] }
    }));

  if (doc && !body.requestId && ['approved', 'hidden'].includes(doc.status)) {
    doc = null;
  }

  const allowedStatuses = ['draft', 'info_requested', 'rejected', 'approved', 'hidden'];
  if (doc && !allowedStatuses.includes(doc.status)) {
    throw new AppError('Yêu cầu không thể gửi ở trạng thái hiện tại.', 400);
  }

  if (doc) await assertRequestEditable(doc);

  // Chặn trùng địa điểm + khung giờ (bỏ qua chính sự kiện/đơn đang sửa).
  await assertNoVenueTimeConflict({
    location: payload.location,
    startDate: payload.startDate,
    endDate: payload.endDate,
    excludeEventId: doc?.eventId,
    excludeRequestId: doc?._id,
  });

  if (!doc) {
    doc = new PartnerEventRequest({ partnerEmail: normalized });
  }

  Object.assign(doc, payload, {
    status: 'pending',
    submittedAt: new Date(),
    hiddenAt: null,
    deletedAt: null,
    supplementReason: '',
    rejectionReason: ''
  });

  const partner = await syncPartnerRecord(normalized, payload, 'pending');
  doc.partnerId = partner._id;
  await doc.save();

  await PartnerEventRequest.updateMany(
    {
      partnerEmail: normalized,
      _id: { $ne: doc._id },
      status: { $in: ['cancelled', 'draft'] }
    },
    { $set: { status: 'deleted', deletedAt: new Date() } }
  );

  bumpPartnerCache(normalized);
  return { request: toRequestApi(doc), partner };
};

const cancelRequest = async (email, requestId) => {
  const doc = await PartnerEventRequest.findById(requestId);
  if (!doc || doc.partnerEmail !== normalizeEmail(email)) {
    throw new AppError('Không tìm thấy yêu cầu!', 404);
  }
  if (doc.status !== 'pending') {
    throw new AppError('Chỉ hủy được yêu cầu đang chờ CTSV duyệt.', 400);
  }
  doc.status = 'cancelled';
  await doc.save();
  if (doc.partnerId) {
    await Partner.findByIdAndUpdate(doc.partnerId, {
      $set: { status: 'rejected', rejectionReason: SELF_CANCEL_REASON }
    });
  }
  bumpPartnerCache(doc.partnerEmail);
  return toRequestApi(doc);
};

// Sự kiện đã có người đăng ký hoặc đã tất toán thì không cho chỉnh sửa/gửi lại lên CTSV.
const assertRequestEditable = async (doc) => {
  if (!doc?.eventId) return;
  const Event = require('../models/Event');
  const ev = await Event.findById(doc.eventId).select('registeredCount settlement').lean();
  if (!ev) return;
  if ((ev.registeredCount || 0) > 0) {
    throw new AppError('Sự kiện đã có người đăng ký nên không thể chỉnh sửa hay gửi lại yêu cầu.', 400);
  }
  if (ev.settlement?.status === 'paid') {
    throw new AppError('Sự kiện đã được tất toán nên không thể chỉnh sửa hay gửi lại yêu cầu.', 400);
  }
};

const updatePendingRequest = async (email, requestId, body) => {
  const doc = await PartnerEventRequest.findById(requestId);
  if (!doc || doc.partnerEmail !== normalizeEmail(email)) {
    throw new AppError('Không tìm thấy yêu cầu!', 404);
  }
  if (doc.status !== 'pending') {
    throw new AppError('Chỉ chỉnh sửa yêu cầu đang chờ duyệt.', 400);
  }
  await assertRequestEditable(doc);
  const payload = buildPayload(body);
  if (!payload.companyName) throw new AppError('Tên doanh nghiệp là bắt buộc!', 400);
  if (!payload.title) throw new AppError('Tên sự kiện là bắt buộc!', 400);
  await assertNoVenueTimeConflict({
    location: payload.location,
    startDate: payload.startDate,
    endDate: payload.endDate,
    excludeEventId: doc.eventId,
    excludeRequestId: doc._id,
  });
  Object.assign(doc, payload);
  await doc.save();
  const partner = await syncPartnerRecord(email, payload, 'pending');
  doc.partnerId = partner._id;
  await doc.save();
  bumpPartnerCache(doc.partnerEmail);
  return toRequestApi(doc);
};

const updateApprovedRequest = async (email, requestId, body) => {
  const doc = await PartnerEventRequest.findById(requestId);
  if (!doc || doc.partnerEmail !== normalizeEmail(email)) {
    throw new AppError('Không tìm thấy yêu cầu!', 404);
  }
  if (!['approved', 'hidden'].includes(doc.status)) {
    throw new AppError('Chỉ chỉnh sửa yêu cầu đã được duyệt.', 400);
  }
  await assertRequestEditable(doc);
  const payload = buildPayload(body);
  await assertNoVenueTimeConflict({
    location: payload.location,
    startDate: payload.startDate,
    endDate: payload.endDate,
    excludeEventId: doc.eventId,
    excludeRequestId: doc._id,
  });
  Object.assign(doc, payload, { status: 'approved', hiddenAt: null });
  await doc.save();
  if (doc.partnerId) await syncPartnerRecord(email, payload, 'approved');
  bumpPartnerCache(doc.partnerEmail);
  return toRequestApi(doc);
};

// Toggle ẩn/bỏ ẩn sự kiện đã duyệt khỏi trang công khai (đồng bộ Event.isHidden).
const hideRequest = async (email, requestId) => {
  const doc = await PartnerEventRequest.findById(requestId);
  if (!doc || doc.partnerEmail !== normalizeEmail(email)) {
    throw new AppError('Không tìm thấy yêu cầu!', 404);
  }
  if (!['approved', 'hidden'].includes(doc.status)) {
    throw new AppError('Chỉ ẩn/bỏ ẩn sự kiện đã được duyệt.', 400);
  }
  const Event = require('../models/Event');
  const willHide = doc.status === 'approved';
  doc.status = willHide ? 'hidden' : 'approved';
  doc.hiddenAt = willHide ? new Date() : null;
  await doc.save();
  if (doc.eventId) {
    await Event.findByIdAndUpdate(doc.eventId, { $set: { isHidden: willHide } });
  }
  bumpPartnerCache(doc.partnerEmail);
  return toRequestApi(doc);
};

const deleteRequest = async (email, requestId) => {
  const doc = await PartnerEventRequest.findById(requestId);
  if (!doc || doc.partnerEmail !== normalizeEmail(email)) {
    throw new AppError('Không tìm thấy yêu cầu!', 404);
  }
  if (!['approved', 'hidden', 'cancelled', 'rejected'].includes(doc.status)) {
    throw new AppError('Chỉ xóa yêu cầu đã duyệt, đang ẩn, đã hủy hoặc bị từ chối.', 400);
  }
  // Không cho xóa nếu sự kiện đã có người đăng ký / đã tất toán.
  await assertRequestEditable(doc);
  const wasCancelled = doc.status === 'cancelled';
  const partnerId = doc.partnerId;
  const partnerEmail = doc.partnerEmail;

  doc.status = 'deleted';
  doc.deletedAt = new Date();
  await doc.save();

  // Xóa mềm luôn sự kiện thật để biến mất khỏi danh sách đối tác và trang công khai.
  if (doc.eventId) {
    const Event = require('../models/Event');
    await Event.findByIdAndUpdate(doc.eventId, {
      $set: { isDeleted: true, isHidden: true },
    });
  }

  if (wasCancelled && partnerId) {
    const otherActive = await PartnerEventRequest.countDocuments({
      partnerEmail,
      status: { $nin: ['cancelled', 'deleted', 'draft'] }
    });
    if (otherActive === 0) {
      const partner = await Partner.findById(partnerId);
      if (partner?.status === 'rejected' && partner.rejectionReason === SELF_CANCEL_REASON) {
        await Contract.deleteMany({ partnerId: partner._id });
        await Partner.findByIdAndDelete(partner._id);
      }
    }
  }

  bumpPartnerCache(partnerEmail);
  return toRequestApi(doc);
};

const listCancelledForEmail = async (email) => {
  const normalized = normalizeEmail(email);
  return PartnerEventRequest.find({
    partnerEmail: normalized,
    status: 'cancelled'
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();
};

const supplementRequest = async (email, requestId, body) => {
  const doc = await PartnerEventRequest.findById(requestId);
  if (!doc || doc.partnerEmail !== normalizeEmail(email)) {
    throw new AppError('Không tìm thấy yêu cầu!', 404);
  }
  if (doc.status !== 'info_requested') {
    throw new AppError('Chỉ bổ sung khi CTSV yêu cầu thông tin.', 400);
  }
  const payload = buildPayload(body);
  Object.assign(doc, payload, {
    status: 'pending',
    supplementReason: '',
    submittedAt: new Date()
  });
  const partner = await syncPartnerRecord(email, payload, 'pending');
  doc.partnerId = partner._id;
  await doc.save();
  bumpPartnerCache(doc.partnerEmail);
  return {
    request: doc.toObject ? doc.toObject() : doc,
    partner
  };
};

module.exports = {
  getActiveRequestForEmail,
  getDraftForEmail,
  getActiveEventRequestBundle,
  saveDraft,
  submitRequest,
  cancelRequest,
  updatePendingRequest,
  updateApprovedRequest,
  hideRequest,
  deleteRequest,
  supplementRequest,
  listCancelledForEmail
};
