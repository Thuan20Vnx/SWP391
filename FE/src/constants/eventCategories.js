/**
 * Code First — danh mục sự kiện (đồng bộ BE/src/constants/eventCategories.js)
 */

export const EVENT_CATEGORIES = [
  'Công nghệ',
  'Văn hóa',
  'Kinh tế',
  'Học thuật',
  'Nghệ thuật',
  'Âm nhạc',
  'Workshop',
  'Thể thao',
  'Kết nối',
  'Khác',
];

/** Tuỳ chọn form CTSV: value = giá trị lưu DB, label = hiển thị UI */
export const CTSV_CATEGORY_OPTIONS = [
  { value: 'Công nghệ', labelKey: 'eventCategory.tech' },
  { value: 'Âm nhạc', labelKey: 'eventCategory.music' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Kết nối', labelKey: 'eventCategory.networking' },
  { value: 'Thể thao', labelKey: 'eventCategory.sport' },
  { value: 'Khác', labelKey: 'eventCategory.other' },
];

const CATEGORY_VALUE_KEYS = {
  'Công nghệ': 'eventCategory.techShort',
  'Văn hóa': 'eventCategory.culture',
  'Kinh tế': 'eventCategory.economics',
  'Học thuật': 'eventCategory.academic',
  'Nghệ thuật': 'eventCategory.art',
  'Âm nhạc': 'eventCategory.music',
  Workshop: 'eventCategory.academic',
  'Thể thao': 'eventCategory.sport',
  'Kết nối': 'eventCategory.networking',
  Khác: 'eventCategory.other',
  'CÔNG NGHỆ': 'eventCategory.techShort',
  'VĂN HÓA': 'eventCategory.culture',
  'KINH TẾ': 'eventCategory.economics',
  'HỌC THUẬT': 'eventCategory.academic',
  'NGHỆ THUẬT': 'eventCategory.art',
  'Sự kiện': 'eventCategory.event',
};

const CATEGORY_FORM_ALIASES = {
  'Công nghệ (IT)': 'Công nghệ',
  Công: 'Công nghệ',
};

export const getCategoryDisplayLabel = (value, t) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const normalized = CATEGORY_FORM_ALIASES[raw] || raw;
  const key = CATEGORY_VALUE_KEYS[normalized] || CATEGORY_VALUE_KEYS[raw];
  if (t && key) return t(key);
  const match = CTSV_CATEGORY_OPTIONS.find((opt) => opt.value === normalized || opt.value === raw);
  if (match?.labelKey && t) return t(match.labelKey);
  return match?.label || raw;
};

export const normalizeEventCategory = (input) => {
  const raw = String(input ?? '').trim();
  if (!raw) return 'Khác';
  if (EVENT_CATEGORIES.includes(raw)) return raw;
  if (CATEGORY_FORM_ALIASES[raw]) return CATEGORY_FORM_ALIASES[raw];
  const matched = EVENT_CATEGORIES.find((cat) => raw.toLowerCase().startsWith(cat.toLowerCase()));
  return matched || 'Khác';
};
