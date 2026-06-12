/** Đối tượng nhận thông báo — đồng bộ BE/src/constants/announcementTargets.js */

export const ANNOUNCEMENT_TARGET_ALL = 'all';

export const ANNOUNCEMENT_TARGET_LABELS = {
  all: 'Tất cả',
  guest: 'Khách',
  student: 'Sinh viên',
  club_manager: 'Quản lý CLB',
  partner: 'Đối tác',
  icpdp: 'IC-PDP',
  ctsv: 'CTSV',
  admin: 'Admin'
};

export const PUBLISHER_ALLOWED_TARGETS = {
  admin: Object.keys(ANNOUNCEMENT_TARGET_LABELS),
  ctsv: Object.keys(ANNOUNCEMENT_TARGET_LABELS),
  icpdp: [ANNOUNCEMENT_TARGET_ALL, 'student', 'club_manager', 'icpdp', 'ctsv'],
  club_manager: [ANNOUNCEMENT_TARGET_ALL, 'guest', 'student', 'club_manager'],
  partner: ['ctsv']
};

export const getDefaultTargetRolesForPublisher = (portalRole) => {
  const allowed = getAllowedTargetsForPublisher(portalRole);
  if (portalRole === 'partner') return ['ctsv'];
  return allowed.includes(ANNOUNCEMENT_TARGET_ALL) ? [ANNOUNCEMENT_TARGET_ALL] : [...allowed];
};

export const normalizeTargetsForPublisher = (portalRole, roles) => {
  if (portalRole === 'partner') return ['ctsv'];
  const allowed = getAllowedTargetsForPublisher(portalRole);
  const selected = normalizeSelectedTargets(roles).filter((r) => allowed.includes(r));
  return selected.length ? selected : getDefaultTargetRolesForPublisher(portalRole);
};

export const getAllowedTargetsForPublisher = (portalRole) =>
  PUBLISHER_ALLOWED_TARGETS[portalRole] || [ANNOUNCEMENT_TARGET_ALL];

const TARGET_LABEL_KEYS = {
  all: 'announce.target.all',
  guest: 'announce.target.guest',
  student: 'announce.target.student',
  club_manager: 'announce.target.club_manager',
  partner: 'announce.target.partner',
  icpdp: 'announce.target.icpdp',
  ctsv: 'announce.target.ctsv',
  admin: 'announce.target.admin',
};

export const formatTargetRolesLabel = (roles = [], t) => {
  if (!roles?.length || roles.includes(ANNOUNCEMENT_TARGET_ALL)) {
    return t ? t('announce.target.all') : ANNOUNCEMENT_TARGET_LABELS.all;
  }
  return roles
    .map((r) => (t && TARGET_LABEL_KEYS[r] ? t(TARGET_LABEL_KEYS[r]) : ANNOUNCEMENT_TARGET_LABELS[r] || r))
    .join(', ');
};

export const normalizeSelectedTargets = (selected) => {
  if (!selected?.length) return [ANNOUNCEMENT_TARGET_ALL];
  if (selected.includes(ANNOUNCEMENT_TARGET_ALL)) return [ANNOUNCEMENT_TARGET_ALL];
  return [...new Set(selected)];
};

export const toggleTargetSelection = (current, value) => {
  if (value === ANNOUNCEMENT_TARGET_ALL) return [ANNOUNCEMENT_TARGET_ALL];
  const withoutAll = current.filter((v) => v !== ANNOUNCEMENT_TARGET_ALL);
  if (withoutAll.includes(value)) {
    const next = withoutAll.filter((v) => v !== value);
    return next.length ? next : [ANNOUNCEMENT_TARGET_ALL];
  }
  return [...withoutAll, value];
};

export const getAnnouncementDetailPath = (portalRole, id) => {
  const annId = String(id || '').trim();
  if (!annId) return '/announcements';
  switch (portalRole) {
    case 'admin':
      return `/admin/announcements/${annId}`;
    case 'ctsv':
      return `/ctsv/announcements/${annId}`;
    case 'icpdp':
      return `/icpdp/announcements/${annId}`;
    case 'club_manager':
      return `/quan-ly-clb/announcements/${annId}`;
    case 'partner':
      return `/partner/announcements/${annId}`;
    default:
      return `/announcements/${annId}`;
  }
};

export const getAnnouncementListPathForPortal = (portalRole) => {
  const config = PORTAL_ANNOUNCEMENT_CONFIG[portalRole];
  return config?.manageLink || '/announcements';
};

export const getPortalEventDetailPath = (portalRole, eventId) => {
  const id = String(eventId || '').trim();
  if (!id) return null;
  if (portalRole === 'ctsv') return `/ctsv/events/${id}`;
  if (portalRole === 'icpdp') return `/icpdp/events/${id}`;
  if (portalRole === 'partner') return `/partner/join/events/${id}`;
  return `/events/${id}`;
};

/** Đường dẫn chi tiết thông báo theo role header notification */
export const getAnnouncementDetailPathForNotifRole = (notifRole, id) => {
  const map = {
    admin: 'admin',
    ctsv: 'ctsv',
    club: 'club_manager',
    partner: 'partner',
    icpdp: 'icpdp',
  };
  return getAnnouncementDetailPath(map[notifRole] || null, id);
};

export const PORTAL_ANNOUNCEMENT_CONFIG = {
  admin: {
    eyebrowKey: 'announce.admin.eyebrow',
    titleKey: 'announce.admin.title',
    subtitleKey: 'announce.admin.subtitle',
    publishLabelKey: 'announce.publish',
    manageLink: '/announcements',
  },
  ctsv: {
    eyebrowKey: 'announce.ctsv.eyebrow',
    titleKey: 'announce.ctsv.title',
    subtitleKey: 'announce.ctsv.subtitle',
    publishLabelKey: 'announce.publish',
    manageLink: '/ctsv/announcements/publish',
  },
  icpdp: {
    eyebrowKey: 'announce.icpdp.eyebrow',
    titleKey: 'announce.icpdp.title',
    subtitleKey: 'announce.icpdp.subtitle',
    publishLabelKey: 'announce.send',
    manageLink: '/icpdp/announcements',
  },
  club_manager: {
    eyebrowKey: 'announce.club.eyebrow',
    titleKey: 'announce.club.title',
    subtitleKey: 'announce.club.subtitle',
    publishLabelKey: 'announce.send',
    manageLink: '/quan-ly-clb/announcements',
  },
  partner: {
    eyebrowKey: 'announce.partner.eyebrow',
    titleKey: 'announce.partner.title',
    subtitleKey: 'announce.partner.subtitle',
    publishLabelKey: 'announce.send',
    manageLink: '/partner/announcements',
  },
};
