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
  'Khác',
];

const CATEGORY_ALIASES = {
  Competition: 'Thể thao',
  'Công nghệ (IT)': 'Công nghệ',
  'công nghệ (it)': 'Công nghệ',
  'công nghệ': 'Công nghệ',
  Công: 'Công nghệ',
  'Kinh doanh': 'Kinh tế',
  'Kinh tế & Khởi nghiệp': 'Kinh tế',
  'Tình nguyện': 'Kết nối',
  'Tình nguyện & Xã hội': 'Kết nối',
  'Học thuật & Công nghệ': 'Học thuật',
  'Nghệ thuật & Sáng tạo': 'Nghệ thuật',
  'Thể thao & Sức khỏe': 'Thể thao',
  'Âm nhạc & Giải trí': 'Âm nhạc',
  'Kỹ năng & Workshop': 'Workshop',
};

const normalizeEventCategory = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Khác';
  if (EVENT_CATEGORIES.includes(raw)) return raw;

  const alias = CATEGORY_ALIASES[raw] || CATEGORY_ALIASES[raw.toLowerCase()];
  if (alias) return alias;

  const matched = EVENT_CATEGORIES.find(
    (cat) => cat.toLowerCase() === raw.toLowerCase() || raw.toLowerCase().startsWith(`${cat.toLowerCase()} `)
  );
  if (matched) return matched;

  return 'Khác';
};

module.exports = {
  EVENT_CATEGORIES,
  CATEGORY_ALIASES,
  CATEGORY_FORM_ALIASES: CATEGORY_ALIASES,
  normalizeEventCategory,
};
