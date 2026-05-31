/** Danh mục sự kiện hợp lệ + chuẩn hóa giá trị từ CLB / form cũ */

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
  const raw = String(value || '').trim();
  if (!raw) return 'Khác';
  if (EVENT_CATEGORIES.includes(raw)) return raw;
  if (CATEGORY_ALIASES[raw]) return CATEGORY_ALIASES[raw];
  const lower = raw.toLowerCase();
  const fuzzy = EVENT_CATEGORIES.find((c) => c.toLowerCase() === lower);
  if (fuzzy) return fuzzy;
  return 'Khác';
};

module.exports = {
  EVENT_CATEGORIES,
  CATEGORY_ALIASES,
  normalizeEventCategory,
};
