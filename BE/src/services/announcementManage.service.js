const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { normalizeRole, resolveUserRole } = require('../utils/role');
const {
  normalizeTargetRoles,
  resolveDocTargetRoles,
  canPublisherUseTargets,
  ANNOUNCEMENT_PUBLISHER_ROLES
} = require('../constants/announcementTargets');
const { isEventLinkableForAnnouncement } = require('../utils/announcementEvents');
const {
  normalizeNoticeCategory,
  getNoticeCategoryLabel,
  getNoticeCategoryTone
} = require('../constants/announcementNoticeCategories');

const MAX_IMAGE_DATA_LEN = 4_500_000;

const formatManageAnnouncement = (doc) => {
  const id = doc._id?.toString?.() || String(doc._id);
  return {
    ...doc,
    id,
    targetRoles: resolveDocTargetRoles(doc),
    targetPartnerId: doc.targetPartnerId?.toString?.() || doc.targetPartnerId || null,
    targetPartnerEmail: doc.targetPartnerEmail || '',
    noticeCategory: normalizeNoticeCategory(doc.noticeCategory),
    publishedAt: doc.publishedAt || doc.published_at || null
  };
};

const resolvePublisherContext = async (authEmail) => {
  const user = await User.findOne({ email: authEmail }).lean();
  if (!user) {
    const err = new Error('Không tìm thấy người dùng!');
    err.status = 404;
    throw err;
  }
  const role = normalizeRole(resolveUserRole(user));
  if (!ANNOUNCEMENT_PUBLISHER_ROLES.includes(role)) {
    const err = new Error('Bạn không có quyền quản lý thông báo!');
    err.status = 403;
    throw err;
  }
  return { user, role };
};

const listFilterForRole = (role, authEmail) => {
  if (role === 'admin' || role === 'ctsv') return {};
  return { publishedByRole: role, publishedByEmail: authEmail };
};

const canManageDoc = (doc, role, authEmail) => {
  if (role === 'admin') return true;
  if (role === 'ctsv') return true;
  return String(doc.publishedByEmail || '').toLowerCase() === String(authEmail || '').toLowerCase();
};

const validatePayload = async ({
  title,
  content,
  image,
  eventId,
  targetRoles,
  noticeCategory,
  publisherRole
}) => {
  if (!title?.trim()) {
    const err = new Error('Tiêu đề thông báo là bắt buộc!');
    err.status = 400;
    throw err;
  }
  if (!content?.trim()) {
    const err = new Error('Nội dung thông báo là bắt buộc!');
    err.status = 400;
    throw err;
  }
  if (image && image.length > MAX_IMAGE_DATA_LEN) {
    const err = new Error('Ảnh minh họa quá lớn. Vui lòng cắt lại hoặc chọn ảnh nhỏ hơn.');
    err.status = 400;
    throw err;
  }
  const roles = normalizeTargetRoles(targetRoles);
  if (!canPublisherUseTargets(publisherRole, roles)) {
    const err = new Error('Đối tượng nhận thông báo không hợp lệ với vai trò của bạn!');
    err.status = 400;
    throw err;
  }
  if (eventId) {
    const linkable = await isEventLinkableForAnnouncement(eventId);
    if (!linkable) {
      const err = new Error(
        'Chỉ được gắn sự kiện cấp trường (CTSV) hoặc sự kiện đối tác đã được CTSV và Admin phê duyệt.'
      );
      err.status = 400;
      throw err;
    }
  }
  return {
    targetRoles: roles,
    noticeCategory: normalizeNoticeCategory(noticeCategory)
  };
};

const listAnnouncements = async (authEmail) => {
  const { role } = await resolvePublisherContext(authEmail);
  const filter = listFilterForRole(role, authEmail);
  const list = await Announcement.find(filter)
    .select('-image')
    .sort({ publishedAt: -1, published_at: -1 })
    .limit(200)
    .populate('eventId', 'title source category')
    .lean();
  return list.map(formatManageAnnouncement);
};

const getAnnouncement = async (authEmail, id) => {
  const { role } = await resolvePublisherContext(authEmail);
  const doc = await Announcement.findById(id).populate('eventId', 'title source category').lean();
  if (!doc) {
    const err = new Error('Không tìm thấy thông báo!');
    err.status = 404;
    throw err;
  }
  if (!canManageDoc(doc, role, authEmail)) {
    const err = new Error('Bạn không có quyền xem thông báo này!');
    err.status = 403;
    throw err;
  }
  return formatManageAnnouncement(doc);
};

const createAnnouncement = async (authEmail, body) => {
  const { role } = await resolvePublisherContext(authEmail);
  const { targetRoles, noticeCategory } = await validatePayload({ ...body, publisherRole: role });
  const doc = await Announcement.create({
    title: body.title.trim(),
    content: body.content.trim(),
    eventId: body.eventId || null,
    image: body.image || '',
    imageFileName: body.imageFileName?.trim() || '',
    targetRoles,
    targetPartnerId: body.targetPartnerId || null,
    targetPartnerEmail: body.targetPartnerEmail?.trim()?.toLowerCase() || '',
    noticeCategory,
    publishedByEmail: authEmail,
    publishedByRole: role,
    publishedAt: new Date(),
    isPublished: true,
    isHidden: false
  });
  return formatManageAnnouncement(doc.toObject());
};

const updateAnnouncement = async (authEmail, id, body) => {
  const { role } = await resolvePublisherContext(authEmail);
  const doc = await Announcement.findById(id);
  if (!doc) {
    const err = new Error('Không tìm thấy thông báo!');
    err.status = 404;
    throw err;
  }
  if (!canManageDoc(doc, role, authEmail)) {
    const err = new Error('Bạn không có quyền sửa thông báo này!');
    err.status = 403;
    throw err;
  }
  const { targetRoles, noticeCategory } = await validatePayload({
    title: body.title ?? doc.title,
    content: body.content ?? doc.content,
    image: body.image ?? doc.image,
    eventId: body.eventId !== undefined ? body.eventId : doc.eventId,
    targetRoles: body.targetRoles ?? resolveDocTargetRoles(doc),
    noticeCategory: body.noticeCategory ?? doc.noticeCategory,
    publisherRole: role
  });
  doc.title = body.title?.trim() || doc.title;
  doc.content = body.content?.trim() || doc.content;
  if (body.eventId !== undefined) doc.eventId = body.eventId || null;
  if (body.image !== undefined) doc.image = body.image || '';
  if (body.imageFileName !== undefined) doc.imageFileName = body.imageFileName?.trim() || '';
  doc.targetRoles = targetRoles;
  doc.noticeCategory = noticeCategory;
  await doc.save();
  return formatManageAnnouncement(doc.toObject());
};

const hideAnnouncement = async (authEmail, id) => {
  const { role } = await resolvePublisherContext(authEmail);
  const doc = await Announcement.findById(id);
  if (!doc) {
    const err = new Error('Không tìm thấy thông báo!');
    err.status = 404;
    throw err;
  }
  if (!canManageDoc(doc, role, authEmail)) {
    const err = new Error('Bạn không có quyền ẩn thông báo này!');
    err.status = 403;
    throw err;
  }
  doc.isHidden = true;
  await doc.save();
  return formatManageAnnouncement(doc.toObject());
};

const deleteAnnouncement = async (authEmail, id) => {
  const { role } = await resolvePublisherContext(authEmail);
  const doc = await Announcement.findById(id);
  if (!doc) {
    const err = new Error('Không tìm thấy thông báo!');
    err.status = 404;
    throw err;
  }
  if (!canManageDoc(doc, role, authEmail)) {
    const err = new Error('Bạn không có quyền xóa thông báo này!');
    err.status = 403;
    throw err;
  }
  await Announcement.findByIdAndDelete(id);
  return { id };
};

module.exports = {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  hideAnnouncement,
  deleteAnnouncement,
  formatManageAnnouncement
};
