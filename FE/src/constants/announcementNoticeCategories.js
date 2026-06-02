export const NOTICE_CATEGORY_INFO = 'info';
export const NOTICE_CATEGORY_ACTION = 'action';
export const NOTICE_CATEGORY_URGENT = 'urgent';

export const NOTICE_CATEGORY_LABELS = {
  [NOTICE_CATEGORY_INFO]: 'Thông tin',
  [NOTICE_CATEGORY_ACTION]: 'Cần xử lý',
  [NOTICE_CATEGORY_URGENT]: 'Khẩn',
};

export const NOTICE_CATEGORY_OPTIONS = [
  { value: NOTICE_CATEGORY_INFO, label: NOTICE_CATEGORY_LABELS.info },
  { value: NOTICE_CATEGORY_ACTION, label: NOTICE_CATEGORY_LABELS.action },
  { value: NOTICE_CATEGORY_URGENT, label: NOTICE_CATEGORY_LABELS.urgent },
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

export const getNoticeCategoryLabel = (value) =>
  NOTICE_CATEGORY_LABELS[normalizeNoticeCategory(value)];

export const getNoticeCategoryTone = (value) =>
  NOTICE_CATEGORY_TONES[normalizeNoticeCategory(value)] || 'info';
