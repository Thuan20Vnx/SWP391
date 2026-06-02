const NOTICE_CATEGORY_INFO = 'info';
const NOTICE_CATEGORY_ACTION = 'action';
const NOTICE_CATEGORY_URGENT = 'urgent';

const NOTICE_CATEGORY_LABELS = {
  [NOTICE_CATEGORY_INFO]: 'Thông tin',
  [NOTICE_CATEGORY_ACTION]: 'Cần xử lý',
  [NOTICE_CATEGORY_URGENT]: 'Khẩn',
};

const NOTICE_CATEGORY_KEYS = Object.keys(NOTICE_CATEGORY_LABELS);

const NOTICE_CATEGORY_TONES = {
  [NOTICE_CATEGORY_INFO]: 'info',
  [NOTICE_CATEGORY_ACTION]: 'warning',
  [NOTICE_CATEGORY_URGENT]: 'alert',
};

const normalizeNoticeCategory = (value) => {
  const key = String(value || '').trim().toLowerCase();
  return NOTICE_CATEGORY_KEYS.includes(key) ? key : NOTICE_CATEGORY_INFO;
};

const getNoticeCategoryLabel = (value) =>
  NOTICE_CATEGORY_LABELS[normalizeNoticeCategory(value)] || NOTICE_CATEGORY_LABELS.info;

const getNoticeCategoryTone = (value) =>
  NOTICE_CATEGORY_TONES[normalizeNoticeCategory(value)] || 'info';

module.exports = {
  NOTICE_CATEGORY_INFO,
  NOTICE_CATEGORY_ACTION,
  NOTICE_CATEGORY_URGENT,
  NOTICE_CATEGORY_LABELS,
  NOTICE_CATEGORY_KEYS,
  NOTICE_CATEGORY_TONES,
  normalizeNoticeCategory,
  getNoticeCategoryLabel,
  getNoticeCategoryTone,
};
