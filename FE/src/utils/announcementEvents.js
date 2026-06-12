import { localizeEventTitle } from './localizeAnnouncement';
import { loadSettings } from '../hooks/useSettingsPreferences';

/** Sự kiện được phép gắn vào thông báo chính thức (CTSV + đối tác đã duyệt đủ). */
export const isAnnouncementLinkableEvent = (ev) => {
  const source = ev?.source || 'club';
  const statusKey = ev?.statusKey || '';
  if (!['approved', 'live'].includes(statusKey)) return false;
  return source === 'school' || source === 'partner';
};

export const formatAnnouncementEventLabel = (ev, t, language) => {
  const lang = language || loadSettings().language || 'vi';
  const rawTitle = ev?.title || (t ? t('eventCategory.event') : 'Sự kiện');
  const title = t ? localizeEventTitle(rawTitle, t, lang) : rawTitle;
  if (ev?.source === 'partner') {
    return t
      ? t('announce.eventLabel.partner', { title })
      : `${title} (Đối tác)`;
  }
  if (ev?.source === 'school') {
    return t
      ? t('announce.eventLabel.school', { title })
      : `${title} (Cấp trường)`;
  }
  return t ? t('announce.eventLabel.default', { title }) : title;
};

export const ANNOUNCEMENT_CATEGORY_LABELS = {
  general: 'Thông báo chung',
  school: 'Sự kiện cấp trường',
  partner: 'Sự kiện đối tác',
  hidden: 'Đã ẩn',
};

const ANNOUNCEMENT_CATEGORY_KEYS = {
  general: 'announce.filter.general',
  school: 'announce.filter.school',
  partner: 'announce.filter.partner',
  hidden: 'announce.filter.hidden',
};

export const getAnnouncementCategoryLabel = (category, t) => {
  const key = ANNOUNCEMENT_CATEGORY_KEYS[category];
  if (t && key) return t(key);
  return ANNOUNCEMENT_CATEGORY_LABELS[category] || category;
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
  return 'general';
};
