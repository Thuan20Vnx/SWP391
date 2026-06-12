/** Sự kiện được phép gắn vào thông báo chính thức (CTSV + đối tác đã duyệt đủ). */
export const isAnnouncementLinkableEvent = (ev) => {
  const source = ev?.source || 'club';
  const statusKey = ev?.statusKey || '';
  if (!['approved', 'live'].includes(statusKey)) return false;
  return source === 'school' || source === 'partner';
};

export const formatAnnouncementEventLabel = (ev) => {
  const title = ev?.title || 'Sự kiện';
  if (ev?.source === 'partner') return `${title} (Đối tác)`;
  if (ev?.source === 'school') return `${title} (Cấp trường)`;
  return title;
};

export const ANNOUNCEMENT_CATEGORY_LABELS = {
  general: 'Thông báo chung',
  school: 'Sự kiện cấp trường',
  partner: 'Sự kiện đối tác',
  icpdp: 'Sự kiện ICPDP',
  club: 'Sự kiện CLB',
  hidden: 'Đã ẩn',
};

/** Phân loại thông báo để lọc danh mục trên portal CTSV. */
export const resolveAnnouncementCategory = (announcement, eventSourceById = {}) => {
  if (announcement?.isHidden) return 'hidden';
  const evId = announcement?.eventId?._id || announcement?.eventId;
  if (!evId) return 'general';
  const source =
    announcement?.eventId?.source || eventSourceById[String(evId)] || 'general';
  if (source === 'school') return 'school';
  if (source === 'partner') return 'partner';
  if (source === 'icpdp') return 'icpdp';
  if (source === 'club') return 'club';
  return 'general';
};
