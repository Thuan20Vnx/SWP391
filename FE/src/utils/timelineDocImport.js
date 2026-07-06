/**
 * Trích xuất kế hoạch timeline kỳ học từ file PDF/Word (.docx) THEO MẪU — offline,
 * KHÔNG gọi AI (để tiết kiệm token). AI chỉ dùng khi bấm nút "Nhờ AI đọc".
 *
 * File mẫu (scripts/generate-timeline-template.mjs) dùng các dòng "Nhãn: giá trị",
 * mỗi hoạt động bắt đầu bằng dòng "Hoạt động N".
 *
 * extractTimelineFromDocFile(file) -> { patch, rawText }
 */
import { readDocText } from './eventDocImport';

const CATEGORY_OPTIONS = ['Công nghệ (IT)', 'Âm nhạc', 'Workshop', 'Kết nối', 'Thể thao', 'Cuộc thi', 'Tình nguyện', 'Seminar', 'Khác'];
const TERM_MAP = { spring: 'spring', summer: 'summer', fall: 'fall' };

/** Bỏ dấu tiếng Việt + lowercase để so khớp nhãn linh hoạt. */
const normalizeLabel = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const SCALAR_LABELS = {
  'ky hoc': 'semesterTerm',
  'nam': 'semesterYear',
  'tom tat ke hoach ky': 'summary',
  'tom tat': 'summary',
  'muc tieu ky hoc': 'objectives',
  'muc tieu': 'objectives',
};

const ITEM_LABELS = {
  'ten': 'title',
  'ten hoat dong': 'title',
  'the loai': 'category',
  'bat dau': 'plannedDate',
  'bat dau du kien': 'plannedDate',
  'ket thuc': 'plannedEndDate',
  'ket thuc du kien': 'plannedEndDate',
  'dia diem': 'location',
  'so nguoi': 'expectedAttendees',
  'so nguoi du kien': 'expectedAttendees',
  'so luong': 'expectedAttendees',
  'mo ta': 'description',
  'mo ta ngan': 'description',
};

/** "20/06/2026 08:00" | "20/06/2026" -> "2026-06-20T08:00" (datetime-local). */
const parseDateTimeValue = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return '';
  let y;
  let mo;
  let d;
  let m = text.match(/(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/); // yyyy-mm-dd
  if (m) {
    [, y, mo, d] = m;
  } else {
    m = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/); // dd/mm/yyyy
    if (m) [, d, mo, y] = m;
  }
  if (!y) return '';
  const time = text.match(/(\d{1,2})\s*[:h]\s*(\d{1,2})/); // HH:mm | HHhMM
  const hh = time ? String(Math.min(Number(time[1]), 23)).padStart(2, '0') : '08';
  const mm = time ? String(Math.min(Number(time[2] || 0), 59)).padStart(2, '0') : '00';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${hh}:${mm}`;
};

const normalizeCategory = (value) => {
  const v = String(value || '').trim();
  if (!v) return 'Workshop';
  const exact = CATEGORY_OPTIONS.find((c) => c.toLowerCase() === v.toLowerCase());
  if (exact) return exact;
  const partial = CATEGORY_OPTIONS.find(
    (c) => normalizeLabel(c).includes(normalizeLabel(v)) || normalizeLabel(v).includes(normalizeLabel(c))
  );
  return partial || 'Workshop';
};

const emptyItem = () => ({
  title: '',
  description: '',
  plannedDate: '',
  plannedEndDate: '',
  category: 'Workshop',
  location: '',
  expectedAttendees: '',
});

const hasItemData = (item) =>
  item && (item.title || item.plannedDate || item.location || item.description);

/** Parse text theo mẫu -> patch { semesterTerm, semesterYear, summary, objectives, items }. */
export const parseTimelineText = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const patch = {};
  const items = [];
  let current = null;

  for (const line of lines) {
    // Dòng bắt đầu một hoạt động: "Hoạt động 1", "Hoạt động #2", "Mốc 1"...
    if (/^(hoat dong|moc|su kien)\s*#?\s*\d+/.test(normalizeLabel(line))) {
      if (hasItemData(current)) items.push(current);
      current = emptyItem();
      continue;
    }

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const labelNorm = normalizeLabel(line.slice(0, idx));
    const value = line.slice(idx + 1).trim();
    if (!value) continue;

    if (current) {
      const field = ITEM_LABELS[labelNorm];
      if (!field) continue;
      if (field === 'category') current.category = normalizeCategory(value);
      else if (field === 'plannedDate' || field === 'plannedEndDate') {
        const parsed = parseDateTimeValue(value);
        if (parsed) current[field] = parsed;
      } else if (field === 'expectedAttendees') {
        const num = parseInt(value.replace(/[^\d]/g, ''), 10);
        if (!Number.isNaN(num) && num > 0) current.expectedAttendees = num;
      } else current[field] = value;
      continue;
    }

    const scalar = SCALAR_LABELS[labelNorm];
    if (!scalar) continue;
    if (scalar === 'semesterTerm') {
      const term = TERM_MAP[normalizeLabel(value)];
      if (term) patch.semesterTerm = term;
    } else if (scalar === 'semesterYear') {
      const num = parseInt(value.replace(/[^\d]/g, ''), 10);
      if (!Number.isNaN(num) && num >= 2020 && num <= 2100) patch.semesterYear = num;
    } else {
      patch[scalar] = value;
    }
  }

  if (hasItemData(current)) items.push(current);
  if (items.length) patch.items = items;
  return patch;
};

/** Đọc file + parse offline. Trả về { patch, rawText }. */
export const extractTimelineFromDocFile = async (file) => {
  const rawText = await readDocText(file);
  const patch = parseTimelineText(rawText);
  return { patch, rawText };
};
