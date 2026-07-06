const { extractJson } = require('./aiProvider.service');

const MAX_INPUT_CHARS = 20000;

const TERM_VALUES = ['spring', 'summer', 'fall'];
const CATEGORY_OPTIONS = [
  'Công nghệ (IT)', 'Âm nhạc', 'Workshop', 'Kết nối', 'Thể thao',
  'Cuộc thi', 'Tình nguyện', 'Seminar', 'Khác',
];

const SYSTEM_PROMPT = `Bạn là trợ lý trích xuất KẾ HOẠCH HOẠT ĐỘNG THEO KỲ HỌC của câu lạc bộ từ văn bản (đọc từ file PDF/Word/Excel).
Nhiệm vụ: đọc nội dung và điền vào form tạo timeline kỳ học.
Quy tắc:
- Chỉ dùng thông tin có trong văn bản, KHÔNG bịa. Không tìm thấy trường nào thì để chuỗi rỗng "" (hoặc mảng rỗng []).
- "semesterTerm" là MỘT trong: ${TERM_VALUES.join(', ')} (Spring/Summer/Fall của FPT). Nếu không rõ để "".
- "semesterYear" là số năm (VD 2026); 0 nếu không rõ.
- "summary" là đoạn tóm tắt định hướng hoạt động của CLB trong kỳ.
- "objectives" là mục tiêu kỳ học (có thể gộp nhiều ý thành một đoạn, ngăn cách bằng xuống dòng).
- "items" là DANH SÁCH các hoạt động / sự kiện dự kiến trong kỳ. Mỗi phần tử gồm:
  - "title": tên hoạt động.
  - "description": mô tả ngắn (nếu có).
  - "plannedDate": thời điểm BẮT ĐẦU dự kiến, định dạng "YYYY-MM-DDTHH:mm" (24 giờ). Nếu chỉ có ngày, dùng "T08:00". Nếu văn bản ghi "20/08/2026" thì trả "2026-08-20T08:00".
  - "plannedEndDate": thời điểm KẾT THÚC dự kiến cùng định dạng; nếu không rõ, để trống "".
  - "category": MỘT trong: ${CATEGORY_OPTIONS.join(', ')}. Chọn gần nghĩa nhất; không rõ dùng "Khác".
  - "location": địa điểm dự kiến (nếu có).
  - "expectedAttendees": số người dự kiến (số nguyên); 0 nếu không rõ.
- Trả về đúng thứ tự thời gian nếu có thể. Bỏ qua các dòng tiêu đề bảng.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    semesterTerm: { type: 'string' },
    semesterYear: { type: 'integer' },
    summary: { type: 'string' },
    objectives: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          plannedDate: { type: 'string' },
          plannedEndDate: { type: 'string' },
          category: { type: 'string' },
          location: { type: 'string' },
          expectedAttendees: { type: 'integer' },
        },
        required: ['title'],
      },
    },
  },
  required: ['items'],
};

const normalizeCategory = (value) => {
  const v = String(value || '').trim();
  if (!v) return 'Khác';
  const exact = CATEGORY_OPTIONS.find((c) => c.toLowerCase() === v.toLowerCase());
  if (exact) return exact;
  const partial = CATEGORY_OPTIONS.find(
    (c) => c.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(c.toLowerCase())
  );
  return partial || 'Khác';
};

/** Chỉ giữ giá trị thật để không ghi đè form bằng chuỗi rỗng. */
const cleanPatch = (parsed) => {
  const patch = {};

  const term = String(parsed.semesterTerm || '').trim().toLowerCase();
  if (TERM_VALUES.includes(term)) patch.semesterTerm = term;

  const year = Number(parsed.semesterYear);
  if (Number.isFinite(year) && year >= 2020 && year <= 2100) patch.semesterYear = Math.round(year);

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  if (summary) patch.summary = summary;

  const objectives = typeof parsed.objectives === 'string' ? parsed.objectives.trim() : '';
  if (objectives) patch.objectives = objectives;

  if (Array.isArray(parsed.items)) {
    const items = parsed.items
      .map((raw) => {
        const title = String(raw?.title || '').trim();
        if (!title) return null;
        const attendees = Number(raw?.expectedAttendees);
        return {
          title,
          description: String(raw?.description || '').trim(),
          plannedDate: String(raw?.plannedDate || '').trim(),
          plannedEndDate: String(raw?.plannedEndDate || '').trim(),
          category: normalizeCategory(raw?.category),
          location: String(raw?.location || '').trim(),
          expectedAttendees: Number.isFinite(attendees) && attendees > 0 ? Math.round(attendees) : '',
        };
      })
      .filter(Boolean);
    if (items.length) patch.items = items;
  }

  return patch;
};

/**
 * Dùng Gemini trích xuất kế hoạch timeline kỳ học từ text thô của file.
 * @param {string} rawText
 * @returns {Promise<{ patch: object }>}
 */
const extractTimelineFromText = async (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) {
    throw new Error('Không có nội dung văn bản để trích xuất.');
  }

  const parsed = await extractJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `NỘI DUNG FILE KẾ HOẠCH KỲ HỌC:\n${text.slice(0, MAX_INPUT_CHARS)}`,
    temperature: 0.1,
    responseSchema: RESPONSE_SCHEMA,
  });

  return { patch: cleanPatch(parsed) };
};

module.exports = { extractTimelineFromText };
