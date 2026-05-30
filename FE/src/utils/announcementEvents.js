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
