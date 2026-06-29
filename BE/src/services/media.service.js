const mongoose = require('mongoose');
const PartnerEventRequest = require('../models/PartnerEventRequest');
const Partner = require('../models/Partner');
const AppError = require('../utils/AppError');
const { normalizeRole } = require('../utils/role');
const {
  resolveCoverResponse,
  resolveAttachmentResponse,
  resolveSpeakerAvatarResponse,
  resolvePartnerLogoResponse,
  writeCover,
  writeAttachment,
} = require('../utils/partnerMediaStorage');
const { isDataUri, isImageDataUri } = require('../utils/dataUriStorage');

const STAFF_ROLES = new Set(['admin', 'ctsv', 'icpdp', 'staff']);

const canAccessPartnerRequest = (request, user) => {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (STAFF_ROLES.has(role)) return true;
  if (role === 'partner') {
    const email = String(user.email || '').trim().toLowerCase();
    return email && email === String(request.partnerEmail || '').trim().toLowerCase();
  }
  return false;
};

const canAccessPartnerLogo = (partner, user) => {
  if (!user) return true;
  const role = normalizeRole(user.role);
  if (STAFF_ROLES.has(role)) return true;
  if (role === 'partner') {
    const email = String(user.email || '').trim().toLowerCase();
    return email && email === String(partner.email || '').trim().toLowerCase();
  }
  return true;
};

const loadPartnerRequest = async (requestId) => {
  const id = String(requestId || '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Không tìm thấy yêu cầu đối tác', 404);
  }
  const doc = await PartnerEventRequest.findById(id).lean();
  if (!doc) throw new AppError('Không tìm thấy yêu cầu đối tác', 404);
  return doc;
};

const sendPartnerRequestCover = async (requestId, res, { user } = {}) => {
  const doc = await loadPartnerRequest(requestId);
  if (!canAccessPartnerRequest(doc, user)) {
    throw new AppError('Bạn không có quyền truy cập tệp này', 403);
  }
  if (isImageDataUri(doc.image) && !doc.coverFileExt) {
    writeCover(String(doc._id), doc.image)
      .then((ext) =>
        PartnerEventRequest.updateOne({ _id: doc._id }, { $set: { coverFileExt: ext, image: '' } })
      )
      .catch(() => {});
  }
  const resolved = await resolveCoverResponse(doc);
  if (!resolved) throw new AppError('Không tìm thấy ảnh bìa', 404);
  res.set('Content-Type', resolved.mime);
  res.set('Cache-Control', 'private, max-age=3600');
  res.send(resolved.buffer);
};

const sendPartnerRequestAttachment = async (requestId, index, res, { user } = {}) => {
  const doc = await loadPartnerRequest(requestId);
  if (!canAccessPartnerRequest(doc, user)) {
    throw new AppError('Bạn không có quyền truy cập tệp này', 403);
  }
  const att = (doc.attachments || [])[Number(index)];
  if (att && isDataUri(att.url) && !att.storedExt) {
    writeAttachment(String(doc._id), Number(index), att.url, att.mimeType, att.name)
      .then(async (ext) => {
        const attachments = [...(doc.attachments || [])];
        attachments[Number(index)] = { ...attachments[Number(index)], url: '', storedExt: ext };
        await PartnerEventRequest.updateOne({ _id: doc._id }, { $set: { attachments } });
      })
      .catch(() => {});
  }
  const resolved = await resolveAttachmentResponse(doc, Number(index));
  if (!resolved) throw new AppError('Không tìm thấy tệp đính kèm', 404);
  const safeName = String(resolved.fileName || 'attachment').replace(/[^\w.\-() ]+/g, '_');
  res.set('Content-Type', resolved.mime);
  res.set('Content-Disposition', `inline; filename="${safeName}"`);
  res.set('Cache-Control', 'private, max-age=3600');
  res.send(resolved.buffer);
};

const sendPartnerRequestSpeakerAvatar = async (requestId, index, res, { user } = {}) => {
  const doc = await loadPartnerRequest(requestId);
  if (!canAccessPartnerRequest(doc, user)) {
    throw new AppError('Bạn không có quyền truy cập ảnh này', 403);
  }
  const resolved = await resolveSpeakerAvatarResponse(doc, Number(index));
  if (!resolved) throw new AppError('Không tìm thấy ảnh diễn giả', 404);
  res.set('Content-Type', resolved.mime);
  res.set('Cache-Control', 'private, max-age=3600');
  res.send(resolved.buffer);
};

const sendPartnerLogo = async (partnerId, res, { user } = {}) => {
  const id = String(partnerId || '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Không tìm thấy logo đối tác', 404);
  }
  const partner = await Partner.findById(id).lean();
  if (!partner) throw new AppError('Không tìm thấy logo đối tác', 404);
  if (!canAccessPartnerLogo(partner, user)) {
    throw new AppError('Bạn không có quyền truy cập logo này', 403);
  }
  const resolved = await resolvePartnerLogoResponse(partner);
  if (!resolved) throw new AppError('Không tìm thấy logo đối tác', 404);
  res.set('Content-Type', resolved.mime);
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(resolved.buffer);
};

module.exports = {
  sendPartnerRequestCover,
  sendPartnerRequestAttachment,
  sendPartnerRequestSpeakerAvatar,
  sendPartnerLogo,
};
