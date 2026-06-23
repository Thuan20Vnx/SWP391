export const NOTICE_CATEGORY_INFO = 'info';
export const NOTICE_CATEGORY_ACTION = 'action';
export const NOTICE_CATEGORY_URGENT = 'urgent';

export const NOTICE_CATEGORY_LABELS = {
  [NOTICE_CATEGORY_INFO]: 'Thông tin',
  [NOTICE_CATEGORY_ACTION]: 'Cần xử lý',
  [NOTICE_CATEGORY_URGENT]: 'Khẩn',
};

const NOTICE_CATEGORY_KEYS = {
  [NOTICE_CATEGORY_INFO]: 'announce.notice.info',
  [NOTICE_CATEGORY_ACTION]: 'announce.notice.action',
  [NOTICE_CATEGORY_URGENT]: 'announce.notice.urgent',
};

export const NOTICE_CATEGORY_OPTIONS = [
  { value: NOTICE_CATEGORY_INFO, labelKey: 'announce.notice.info' },
  { value: NOTICE_CATEGORY_ACTION, labelKey: 'announce.notice.action' },
  { value: NOTICE_CATEGORY_URGENT, labelKey: 'announce.notice.urgent' },
];

export const NOTICE_CATEGORY_TONES = {
  [NOTICE_CATEGORY_INFO]: 'info',
  [NOTICE_CATEGORY_ACTION]: 'warning',
  [NOTICE_CATEGORY_URGENT]: 'alert',
};

export const normalizeNoticeCategory = (value) => {
  const key = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(NOTICE_CATEGORY_LABELS, key)
    ? key
    : NOTICE_CATEGORY_INFO;
};

export const getNoticeCategoryLabel = (value, t) => {
  const normalized = normalizeNoticeCategory(value);
  const labelKey = NOTICE_CATEGORY_KEYS[normalized];
  if (t && labelKey) return t(labelKey);
  return NOTICE_CATEGORY_LABELS[normalized];
};

export const getNoticeCategoryTone = (value) =>
  NOTICE_CATEGORY_TONES[normalizeNoticeCategory(value)] || 'info';
