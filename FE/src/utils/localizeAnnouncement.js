import { getAnnouncementCategoryLabel } from './announcementEvents';
import { getNoticeCategoryLabel } from '../constants/announcementNoticeCategories';
import { loadSettings } from '../hooks/useSettingsPreferences';

/** Map tiêu đề gốc (VI) → key dịch nội dung demo / seed */
const CONTENT_BY_TITLE = {
  'Mở sự kiện lẹo chó tập thể': {
    titleKey: 'announce.seed.leocho.title',
    contentKey: 'announce.seed.leocho.content',
    eventTitleKey: 'announce.seed.leocho.eventTitle',
  },
  'Thông báo mở đăng ký sự kiện FPT Music Night 2026': {
    titleKey: 'announce.seed.musicNight.title',
    contentKey: 'announce.seed.musicNight.content',
  },
};

const EVENT_TITLE_BY_VI = {
  'Sự kiện lẹo chó tập thể': 'announce.seed.leocho.eventTitle',
  'FPT Music Night 2026': 'announce.seed.musicNight.eventShort',
};

const CATEGORY_BY_VI = {
  'Toàn trường': 'announce.public.category.campus',
  'Sự kiện': 'announce.public.category.event',
};

const ROLE_BY_VI = {
  Trường: 'announce.public.role.school',
  'Quản lý CLB': 'announce.public.role.clubManager',
};

const resolveLang = (language) => language || loadSettings().language || 'vi';

export const formatAnnouncementRelativeTime = (value, language) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const lang = resolveLang(language);

  if (lang !== 'en') {
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
      year: 'numeric',
    }).format(date);
  }

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatAnnouncementAbsoluteTime = (value, language) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const lang = resolveLang(language);
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const localizeTextField = (value, key, t, language) => {
  if (!value || resolveLang(language) === 'vi') return value;
  if (key && t) return t(key);
  return value;
};

export const localizeEventTitle = (title, t, language) => {
  if (!title || resolveLang(language) === 'vi') return title;
  const key = EVENT_TITLE_BY_VI[title];
  return key && t ? t(key) : title;
};

export const localizeAnnouncementContent = (record, t, language) => {
  if (!record || resolveLang(language) === 'vi') return record;
  const mapping = CONTENT_BY_TITLE[record.title?.trim()];
  if (!mapping) return record;

  return {
    ...record,
    title: localizeTextField(record.title, mapping.titleKey, t, language),
    content: localizeTextField(record.content, mapping.contentKey, t, language),
    body: localizeTextField(record.body || record.content, mapping.contentKey, t, language),
    excerpt: mapping.contentKey
      ? t(mapping.contentKey).slice(0, 140) + (t(mapping.contentKey).length > 140 ? '…' : '')
      : record.excerpt,
    eventTitle: record.eventTitle
      ? localizeTextField(record.eventTitle, mapping.eventTitleKey, t, language)
      : record.eventTitle,
  };
};

export const localizePublicAnnouncement = (item, t, language) => {
  if (!item) return item;
  const lang = resolveLang(language);
  let next = { ...item };

  if (lang === 'en') {
    next = localizeAnnouncementContent(next, t, lang);
    if (next.category && CATEGORY_BY_VI[next.category]) {
      next.category = t(CATEGORY_BY_VI[next.category]);
    }
    if (next.sender && ROLE_BY_VI[next.sender]) {
      next.sender = t(ROLE_BY_VI[next.sender]);
    }
    if (next.publisherRoleLabel && ROLE_BY_VI[next.publisherRoleLabel]) {
      next.publisherRoleLabel = t(ROLE_BY_VI[next.publisherRoleLabel]);
    }
    if (next.eventTitle) {
      next.eventTitle = localizeEventTitle(next.eventTitle, t, lang);
    }
    if (next.noticeCategory) {
      next.noticeCategoryLabel = getNoticeCategoryLabel(next.noticeCategory, t);
    }
    if (next.publishedAt || next.time) {
      next.time = formatAnnouncementRelativeTime(next.publishedAt, lang);
      next.publishedAtLabel = formatAnnouncementAbsoluteTime(next.publishedAt, lang);
    }
  }

  return next;
};

export const localizeManagedAnnouncement = (record, t, language, eventTitleById = {}) => {
  if (!record) return record;
  const lang = resolveLang(language);
  let next = { ...record };

  if (lang === 'en') {
    next = localizeAnnouncementContent(next, t, lang);
    const evId = record.eventId?._id || record.eventId;
    const linkedTitle = evId ? eventTitleById[evId] || record.eventId?.title : null;
    if (linkedTitle) {
      next._localizedEventTitle = localizeEventTitle(linkedTitle, t, lang);
    }
  }

  return next;
};

export const getLocalizedCategoryLabel = (cat, t) => getAnnouncementCategoryLabel(cat, t);
