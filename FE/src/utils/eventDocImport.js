/**
 * Trích xuất thông tin sự kiện từ file PDF hoặc Word (.docx) theo mẫu template.
 *
 * File mẫu dùng các dòng có nhãn cố định, ví dụ:
 *   Tên sự kiện: Workshop Lập trình Flutter
 *   Thể loại: Workshop
 *   Địa điểm: Tầng 5 tòa Alpha
 *   Ngày bắt đầu sự kiện: 20/08/2026
 *   ...
 *
 * Cách dùng: extractEventFromDocFile(file) -> { patch, rawText }
 *   - patch: object các trường form đã map sẵn (chỉ chứa trường tìm thấy)
 *   - rawText: toàn bộ text đọc được (để debug / hiển thị)
 */
import { normalizeEventCategory } from '../constants/eventCategories';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME = 'application/pdf';

export const EVENT_DOC_ACCEPT = '.pdf,.docx';

export const isSupportedEventDoc = (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf') || name.endsWith('.docx')) return true;
  return file.type === PDF_MIME || file.type === DOCX_MIME;
};

/** Bỏ dấu tiếng Việt + lowercase để so khớp nhãn linh hoạt. */
const normalizeLabel = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Danh sách nhãn chấp nhận cho từng trường (đã bỏ dấu). Thứ tự = độ ưu tiên. */
const FIELD_LABELS = [
  { field: 'title', labels: ['ten su kien', 'ten chuong trinh', 'ten'] },
  { field: 'category', labels: ['the loai', 'the loai su kien', 'danh muc'] },
  { field: 'speaker', labels: ['dien gia', 'khach moi', 'dien gia / khach moi'] },
  { field: 'description', labels: ['mo ta', 'gioi thieu', 'gioi thieu su kien', 'noi dung'] },
  { field: 'agenda', labels: ['chuong trinh', 'agenda', 'chuong trinh du kien', 'lich trinh'] },
  { field: 'location', labels: ['dia diem', 'dia diem to chuc', 'noi to chuc'] },
  { field: 'maxSlots', labels: ['so luong ve', 'so luong', 'so slot', 'suc chua', 'so ve toi da'] },
  { field: 'learningOutcomes', labels: ['ban se hoc duoc gi', 'ban se hoc duoc', 'ket qua', 'muc tieu'] },
  { field: 'regStartDate', labels: ['ngay bat dau dang ky', 'ngay mo dang ky'] },
  { field: 'regStartTime', labels: ['gio bat dau dang ky', 'gio mo dang ky'] },
  { field: 'regEndDate', labels: ['ngay ket thuc dang ky', 'ngay dong dang ky'] },
  { field: 'regEndTime', labels: ['gio ket thuc dang ky', 'gio dong dang ky'] },
  { field: 'eventStartDate', labels: ['ngay bat dau su kien', 'ngay to chuc', 'ngay bat dau'] },
  { field: 'eventStartTime', labels: ['gio bat dau su kien', 'gio bat dau'] },
  { field: 'eventEndDate', labels: ['ngay ket thuc su kien', 'ngay ket thuc'] },
  { field: 'eventEndTime', labels: ['gio ket thuc su kien', 'gio ket thuc'] },
];

const DATE_FIELDS = new Set([
  'regStartDate',
  'regEndDate',
  'eventStartDate',
  'eventEndDate',
]);
const TIME_FIELDS = new Set([
  'regStartTime',
  'regEndTime',
  'eventStartTime',
  'eventEndTime',
]);

/** Chuyển "20/08/2026", "20-8-2026", "2026/08/20" -> "2026-08-20" (định dạng input[type=date]). */
const parseDateValue = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return '';
  // yyyy-mm-dd hoặc yyyy/mm/dd
  let m = text.match(/(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // dd/mm/yyyy
  m = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
};

/** Chuyển "8h30", "8:30", "08 giờ 30", "14h" -> "HH:mm". */
const parseTimeValue = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return '';
  const m = text.match(/(\d{1,2})\s*(?:[:h]|giờ|gio)\s*(\d{1,2})?/i);
  if (!m) return '';
  const hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  if (Number.isNaN(hour) || hour > 23 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

/** Đọc raw text từ file PDF/DOCX. */
export const readDocText = async (file) => {
  const buffer = await file.arrayBuffer();
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.docx') || file.type === DOCX_MIME) {
    const { default: mammoth } = await import('mammoth/mammoth.browser');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  }
  // PDF — tải pdfjs khi cần
  const pdfjsLib = await import('pdfjs-dist');
  const { default: pdfWorkerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const parts = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it) => it.str).join(' '));
  }
  return parts.join('\n');
};

/** Tìm field khớp với nhãn (phần trước dấu ":"). */
const matchField = (labelPart) => {
  const norm = normalizeLabel(labelPart);
  for (const { field, labels } of FIELD_LABELS) {
    if (labels.includes(norm)) return field;
  }
  return null;
};

/** Parse text -> patch object cho form. */
export const parseEventText = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const patch = {};
  const learning = [];

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const labelPart = line.slice(0, idx);
    const value = line.slice(idx + 1).trim();
    if (!value) continue;
    const field = matchField(labelPart);
    if (!field) continue;

    if (field === 'category') {
      patch.category = normalizeEventCategory(value);
    } else if (field === 'maxSlots') {
      const num = parseInt(value.replace(/[^\d]/g, ''), 10);
      if (!Number.isNaN(num) && num > 0) patch.maxSlots = num;
    } else if (DATE_FIELDS.has(field)) {
      const parsed = parseDateValue(value);
      if (parsed) patch[field] = parsed;
    } else if (TIME_FIELDS.has(field)) {
      const parsed = parseTimeValue(value);
      if (parsed) patch[field] = parsed;
    } else if (field === 'learningOutcomes') {
      // Cho phép nhiều mục ngăn cách bởi ; hoặc dấu xuống dòng dạng "- "
      value
        .split(/[;\n]|(?:^|\s)-\s/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => learning.push(s));
    } else {
      patch[field] = value;
    }
  }

  if (learning.length) patch.learningOutcomes = learning;
  return patch;
};

/** Đọc file + parse. Trả về { patch, rawText }. */
export const extractEventFromDocFile = async (file) => {
  const rawText = await readDocText(file);
  const patch = parseEventText(rawText);
  return { patch, rawText };
};
