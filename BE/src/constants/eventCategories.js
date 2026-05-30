/**
 * Code First — danh mục sự kiện (đồng bộ FE/src/constants/eventCategories.js)
 * Nguồn gốc enum: Event.category
 */

const EVENT_CATEGORIES = [
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

/** Nhãn form CTSV → giá trị lưu DB */
const CATEGORY_FORM_ALIASES = {
  'Công nghệ (IT)': 'Công nghệ',
  'công nghệ (it)': 'Công nghệ',
  'công nghệ': 'Công nghệ',
  Công: 'Công nghệ'
};

const normalizeEventCategory = (input) => {
  const raw = String(input ?? '').trim();
  if (!raw) return 'Khác';
  if (EVENT_CATEGORIES.includes(raw)) return raw;

  const alias = CATEGORY_FORM_ALIASES[raw] || CATEGORY_FORM_ALIASES[raw.toLowerCase()];
  if (alias) return alias;

  const matched = EVENT_CATEGORIES.find(
    (cat) => cat.toLowerCase() === raw.toLowerCase() || raw.toLowerCase().startsWith(`${cat.toLowerCase()} `)
  );
  return matched || 'Khác';
};

module.exports = {
  EVENT_CATEGORIES,
  CATEGORY_FORM_ALIASES,
  normalizeEventCategory
};
