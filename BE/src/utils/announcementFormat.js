const { normalizeEventCategory } = require('../constants/eventCategories');
const { resolveDocTargetRoles, viewerMatchesTargets } = require('../constants/announcementTargets');
const {
  normalizeNoticeCategory,
  getNoticeCategoryLabel,
  getNoticeCategoryTone
} = require('../constants/announcementNoticeCategories');

/** Bao gồm schema mới (isPublished/isHidden) và bản ghi seed legacy (published_at, deleted_at). */
const PUBLIC_ANNOUNCEMENT_FILTER = {
  $and: [
    {
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    },
    {
      $or: [{ isHidden: { $ne: true } }, { isHidden: { $exists: false } }]
    },
    {
      $or: [
        { isPublished: true },
        {
          isPublished: { $exists: false },
          $or: [{ published_at: { $exists: true } }, { publishedAt: { $exists: true } }]
        }
      ]
    }
  ]
};

const excerptText = (text, max = 140) => {
  const t = String(text || '').trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max)}…`;
};

const formatRelativeTimeVi = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const resolveSenderLabel = (doc) => {
  return resolvePublisherRoleLabel(doc?.publishedByRole);
};

const resolvePublisherRoleLabel = (role) => {
  const r = String(role || '').toLowerCase();
  if (r === 'ctsv' || r === 'staff') return 'CTSV';
  if (r === 'icpdp') return 'IC-PDP';
  if (r === 'partner') return 'Partner';
  if (r === 'admin') return 'Trường';
  if (r === 'club_manager') return 'Quản lý CLB';
  return 'Trường';
};

const formatAbsolutePublishedAt = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const buildPublisherUserMap = (users = []) => {
  const map = new Map();
  users.forEach((user) => {
    if (user?.email) map.set(String(user.email).toLowerCase(), user);
  });
  return map;
};

const resolvePublisherAvatar = (user) => {
  if (!user) return '';
  const isCustom = (value) => typeof value === 'string' && value.startsWith('data:image/');
  if (isCustom(user.picture)) return user.picture;
  if (isCustom(user.avatar)) return user.avatar;
  return user.picture || user.avatar || '';
};

const resolvePublisherFields = (doc, userMap, options = {}) => {
  const email = String(doc?.publishedByEmail || '').trim();
  const user = email ? userMap?.get?.(email.toLowerCase()) : null;
  const publishedByRole = doc?.publishedByRole || user?.role || '';
  const fields = {
    publisherName: user?.fullname || (email ? email.split('@')[0] : 'Ban quản trị'),
    publisherEmail: email,
    publishedByRole,
    publisherRoleLabel: resolvePublisherRoleLabel(publishedByRole)
  };
  if (options.withPublisherAvatar) {
    fields.publisherAvatar = resolvePublisherAvatar(user);
  }
  return fields;
};

const resolveCategoryLabel = (doc) => {
  if (doc?.type === 'event') return 'Sự kiện';
  if (doc?.eventId?.category) {
    return normalizeEventCategory(doc.eventId.category) || 'Sự kiện';
  }
  if (doc?.eventId?.title) return 'Sự kiện';
  return 'Toàn trường';
};

const resolvePublishedAt = (doc) => doc?.publishedAt || doc?.published_at || null;

const formatPublicAnnouncement = (doc, userMap, options = {}) => {
  const id = doc._id?.toString?.() || String(doc._id);
  const publishedAt = resolvePublishedAt(doc);
  const publisher = resolvePublisherFields(doc, userMap, options);
  const noticeCategory = normalizeNoticeCategory(doc.noticeCategory);
  const notificationTone = getNoticeCategoryTone(noticeCategory);
  return {
    id,
    title: doc.title,
    content: doc.content || '',
    excerpt: excerptText(doc.content),
    body: doc.content || '',
    sender: publisher.publisherRoleLabel,
    publisherName: publisher.publisherName,
    publisherEmail: publisher.publisherEmail,
    publisherAvatar: publisher.publisherAvatar || '',
    publisherRoleLabel: publisher.publisherRoleLabel,
    publishedByRole: publisher.publishedByRole,
    time: formatRelativeTimeVi(publishedAt),
    publishedAt,
    publishedAtLabel: formatAbsolutePublishedAt(publishedAt),
    category: resolveCategoryLabel(doc),
    noticeCategory,
    noticeCategoryLabel: getNoticeCategoryLabel(noticeCategory),
    image: doc.image || '',
    eventId: doc.eventId?._id?.toString?.() || doc.eventId?.toString?.() || null,
    eventTitle: doc.eventId?.title || null,
    important: noticeCategory === 'action' || noticeCategory === 'urgent' || Boolean(doc.eventId) || doc.type === 'event' || Boolean(doc.is_pinned),
    urgent: noticeCategory === 'urgent',
    notificationTone,
    targetRoles: resolveDocTargetRoles(doc),
  };
};

const filterAnnouncementsForViewer = (docs, viewerRole, viewerEmail = '') =>
  (docs || []).filter((doc) => viewerMatchesTargets(viewerRole || 'guest', doc, viewerEmail));

module.exports = {
  PUBLIC_ANNOUNCEMENT_FILTER,
  formatPublicAnnouncement,
  formatRelativeTimeVi,
  formatAbsolutePublishedAt,
  excerptText,
  filterAnnouncementsForViewer,
  buildPublisherUserMap,
  resolvePublisherRoleLabel
};
