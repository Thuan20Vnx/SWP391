const Partner = require('../models/Partner');
const PartnerEventRequest = require('../models/PartnerEventRequest');
const Contract = require('../models/Contract');
const AppError = require('../utils/AppError');

const MAX_IMAGE_LEN = 4_500_000;
const MAX_ATTACHMENT_LEN = 2_000_000;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

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
    title: body.title?.trim() || body.proposedEventTitle?.trim() || '',
    eventType: body.eventType?.trim() || 'Hội thảo & Workshop',
    description: body.description?.trim() || '',
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    duration: body.duration?.trim() || '',
    format: body.format || 'campus',
    location: body.location?.trim() || '',
    campus: body.campus?.trim() || '',
    agenda: body.agenda?.trim() || '',
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
  }).sort({ updatedAt: -1 });
};

const getDraftForEmail = async (email) => {
  const normalized = normalizeEmail(email);
  const draft = await PartnerEventRequest.findOne({
    partnerEmail: normalized,
    status: 'draft'
  }).sort({ updatedAt: -1 });
  return draft;
};

const saveDraft = async (email, body) => {
  const normalized = normalizeEmail(email);
  const payload = buildPayload(body);
  let doc = await getDraftForEmail(normalized);
  if (!doc) {
    const blocking = await PartnerEventRequest.findOne({
      partnerEmail: normalized,
      status: { $in: ['pending', 'info_requested', 'approved', 'hidden'] }
    });
    if (blocking && blocking.status !== 'draft') {
      throw new AppError('Đã có yêu cầu sự kiện đang xử lý. Không thể tạo nháp mới.', 400);
    }
    doc = new PartnerEventRequest({ partnerEmail: normalized, status: 'draft' });
  }
  Object.assign(doc, payload, { status: 'draft' });
  await doc.save();
  return doc;
};

const syncPartnerRecord = async (email, payload, status = 'pending') => {
  const normalized = normalizeEmail(email);
  let partner = await Partner.findOne({ email: normalized, status: { $ne: 'rejected' } }).sort({
    createdAt: -1
  });
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
    Object.assign(partner, partnerData);
    await partner.save();
    const contract = await Contract.findOne({ partnerId: partner._id }).sort({ createdAt: -1 });
    if (contract) {
      contract.title = payload.title || contract.title;
      contract.amount = payload.expectedSponsorAmount || contract.amount;
      await contract.save();
    }
  }
  return partner;
};

const submitRequest = async (email, body) => {
  const normalized = normalizeEmail(email);
  const payload = buildPayload(body);
  if (!payload.companyName) throw new AppError('Tên doanh nghiệp là bắt buộc!', 400);
  if (!payload.title) throw new AppError('Tên sự kiện là bắt buộc!', 400);
  if (!payload.startDate || Number.isNaN(payload.startDate.getTime())) {
    throw new AppError('Ngày tổ chức là bắt buộc!', 400);
  }

  let doc =
    (body.requestId && (await PartnerEventRequest.findById(body.requestId))) ||
    (await getDraftForEmail(normalized)) ||
    (await PartnerEventRequest.findOne({
      partnerEmail: normalized,
      status: { $in: ['info_requested', 'approved', 'hidden'] }
    }));

  if (doc && !['draft', 'info_requested', 'approved', 'hidden'].includes(doc.status)) {
    throw new AppError('Yêu cầu không thể gửi ở trạng thái hiện tại.', 400);
  }

  if (!doc) {
    doc = new PartnerEventRequest({ partnerEmail: normalized });
  }

  Object.assign(doc, payload, {
    status: 'pending',
    submittedAt: new Date(),
    hiddenAt: null,
    deletedAt: null,
    supplementReason: ''
  });

  const partner = await syncPartnerRecord(normalized, payload, 'pending');
  doc.partnerId = partner._id;
  await doc.save();
  return { request: doc, partner };
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
      $set: { status: 'rejected', rejectionReason: 'Đối tác đã hủy yêu cầu' }
    });
  }
  return doc;
};

const updateApprovedRequest = async (email, requestId, body) => {
  const doc = await PartnerEventRequest.findById(requestId);
  if (!doc || doc.partnerEmail !== normalizeEmail(email)) {
    throw new AppError('Không tìm thấy yêu cầu!', 404);
  }
  if (!['approved', 'hidden'].includes(doc.status)) {
    throw new AppError('Chỉ chỉnh sửa yêu cầu đã được duyệt.', 400);
  }
  const payload = buildPayload(body);
  Object.assign(doc, payload, { status: 'approved', hiddenAt: null });
  await doc.save();
  if (doc.partnerId) await syncPartnerRecord(email, payload, 'approved');
  return doc;
};

const hideRequest = async (email, requestId) => {
  const doc = await PartnerEventRequest.findById(requestId);
  if (!doc || doc.partnerEmail !== normalizeEmail(email)) {
    throw new AppError('Không tìm thấy yêu cầu!', 404);
  }
  if (doc.status !== 'approved') {
    throw new AppError('Chỉ ẩn yêu cầu đã được duyệt.', 400);
  }
  doc.status = 'hidden';
  doc.hiddenAt = new Date();
  await doc.save();
  return doc;
};

const deleteRequest = async (email, requestId) => {
  const doc = await PartnerEventRequest.findById(requestId);
  if (!doc || doc.partnerEmail !== normalizeEmail(email)) {
    throw new AppError('Không tìm thấy yêu cầu!', 404);
  }
  if (!['approved', 'hidden'].includes(doc.status)) {
    throw new AppError('Chỉ xóa yêu cầu đã được duyệt hoặc đang ẩn.', 400);
  }
  doc.status = 'deleted';
  doc.deletedAt = new Date();
  await doc.save();
  return doc;
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
  return { request: doc, partner };
};

const getPartnerEventRequestsBundle = async (email) => {
  const normalized = normalizeEmail(email);
  const rows = await PartnerEventRequest.find({
    partnerEmail: normalized,
    status: { $ne: 'deleted' }
  })
    .sort({ updatedAt: -1 })
    .limit(40)
    .lean();

  const cancelled = rows.filter((row) => row.status === 'cancelled').slice(0, 20);
  const active = rows.filter((row) => row.status !== 'cancelled');
  const request = active[0] || null;
  const draft = active.find((row) => row.status === 'draft') || null;

  return {
    request: request || draft || null,
    draft: draft || null,
    cancelled
  };
};

module.exports = {
  getActiveRequestForEmail,
  getDraftForEmail,
  getPartnerEventRequestsBundle,
  saveDraft,
  submitRequest,
  cancelRequest,
  updateApprovedRequest,
  hideRequest,
  deleteRequest,
  supplementRequest
};
