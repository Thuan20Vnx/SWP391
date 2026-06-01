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
  partner: [ANNOUNCEMENT_TARGET_ALL, 'guest', 'student', 'partner']
};

export const getAllowedTargetsForPublisher = (portalRole) =>
  PUBLISHER_ALLOWED_TARGETS[portalRole] || [ANNOUNCEMENT_TARGET_ALL];

export const formatTargetRolesLabel = (roles = []) => {
  if (!roles?.length || roles.includes(ANNOUNCEMENT_TARGET_ALL)) return 'Tất cả';
  return roles.map((r) => ANNOUNCEMENT_TARGET_LABELS[r] || r).join(', ');
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

export const PORTAL_ANNOUNCEMENT_CONFIG = {
  admin: {
    eyebrow: 'Truyền thông Admin',
    title: 'Thông báo hệ thống',
    subtitle: 'Gửi thông báo tới các nhóm người dùng trong hệ thống.',
    publishLabel: 'Phát hành thông báo',
    manageLink: '/admin/announcements'
  },
  ctsv: {
    eyebrow: 'Truyền thông CTSV',
    title: 'Thông báo chính thức',
    subtitle: 'Phát hành thông báo toàn trường và quản lý danh sách đã gửi.',
    publishLabel: 'Phát hành thông báo',
    manageLink: '/ctsv/announcements/publish'
  },
  icpdp: {
    eyebrow: 'Truyền thông IC-PDP',
    title: 'Thông báo CLB',
    subtitle: 'Gửi thông báo nội bộ tới sinh viên, CLB và CTSV.',
    publishLabel: 'Gửi thông báo',
    manageLink: '/icpdp/announcements'
  },
  club_manager: {
    eyebrow: 'Truyền thông CLB',
    title: 'Thông báo câu lạc bộ',
    subtitle: 'Thông báo tới thành viên và sinh viên quan tâm CLB.',
    publishLabel: 'Gửi thông báo',
    manageLink: '/quan-ly-clb/announcements'
  },
  partner: {
    eyebrow: 'Truyền thông đối tác',
    title: 'Thông báo đối tác',
    subtitle: 'Gửi thông báo về sự kiện và hoạt động tới sinh viên và khách.',
    publishLabel: 'Gửi thông báo',
    manageLink: '/partner/announcements'
  }
};
