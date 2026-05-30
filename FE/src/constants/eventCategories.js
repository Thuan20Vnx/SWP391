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
  'Khác'
];

/** Tuỳ chọn form CTSV: value = giá trị lưu DB, label = hiển thị UI */
export const CTSV_CATEGORY_OPTIONS = [
  { value: 'Công nghệ', label: 'Công nghệ (IT)' },
  { value: 'Âm nhạc', label: 'Âm nhạc' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Kết nối', label: 'Kết nối' },
  { value: 'Thể thao', label: 'Thể thao' },
  { value: 'Khác', label: 'Khác' }
];

const CATEGORY_FORM_ALIASES = {
  'Công nghệ (IT)': 'Công nghệ',
  Công: 'Công nghệ'
};

export const normalizeEventCategory = (input) => {
  const raw = String(input ?? '').trim();
  if (!raw) return 'Khác';
  if (EVENT_CATEGORIES.includes(raw)) return raw;
  if (CATEGORY_FORM_ALIASES[raw]) return CATEGORY_FORM_ALIASES[raw];
  const matched = EVENT_CATEGORIES.find((cat) => raw.toLowerCase().startsWith(cat.toLowerCase()));
  return matched || 'Khác';
};
