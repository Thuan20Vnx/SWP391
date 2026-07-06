const { EVENT_CATEGORIES, normalizeEventCategory } = require('../constants/eventCategories');
const { extractJson } = require('./aiProvider.service');

const MAX_INPUT_CHARS = 20000;

const SYSTEM_PROMPT = `Bạn là trợ lý trích xuất thông tin sự kiện từ văn bản kế hoạch (đọc từ file PDF/Word).
Nhiệm vụ: đọc nội dung và điền vào các trường của form tạo sự kiện.
Quy tắc:
- Chỉ dùng thông tin có trong văn bản, KHÔNG bịa. Nếu không tìm thấy một trường, để chuỗi rỗng "" (hoặc 0 với số).
- Ngày trả về đúng định dạng "YYYY-MM-DD". Giờ đúng định dạng "HH:mm" (24 giờ). Nếu văn bản ghi "8h30" thì trả "08:30", "20/08/2026" thì trả "2026-08-20".
- "category" phải là MỘT trong các giá trị: ${EVENT_CATEGORIES.join(', ')}. Chọn giá trị gần nghĩa nhất; nếu không rõ để "".
- "maxSlots" là số nguyên sức chứa/số vé; 0 nếu không rõ.
- "learningOutcomes" là mảng các mục ngắn "bạn sẽ học được gì"; [] nếu không có.
- "description" là đoạn mô tả/giới thiệu sự kiện. "agenda" là chương trình/lịch trình dự kiến.
- BẮT BUỘC xuất đủ TẤT CẢ khóa sau trong object JSON, không được bỏ sót khóa nào (điền giá trị nếu văn bản có, ngược lại để "" hoặc 0): title, category, speaker, description, agenda, location, maxSlots, learningOutcomes, regStartDate, regStartTime, regEndDate, regEndTime, eventStartDate, eventStartTime, eventEndDate, eventEndTime.
- "title" là TÊN sự kiện (thường sau nhãn "Tên sự kiện") — luôn cố gắng điền, KHÔNG để trống nếu văn bản có tên.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    category: { type: 'string' },
    speaker: { type: 'string' },
    description: { type: 'string' },
    agenda: { type: 'string' },
    location: { type: 'string' },
    maxSlots: { type: 'integer' },
    learningOutcomes: { type: 'array', items: { type: 'string' } },
    regStartDate: { type: 'string' },
    regStartTime: { type: 'string' },
    regEndDate: { type: 'string' },
    regEndTime: { type: 'string' },
    eventStartDate: { type: 'string' },
    eventStartTime: { type: 'string' },
    eventEndDate: { type: 'string' },
    eventEndTime: { type: 'string' },
  },
  required: ['title', 'category', 'location'],
};

/** Chỉ giữ các trường có giá trị thật để không ghi đè form bằng chuỗi rỗng. */
const cleanPatch = (parsed) => {
  const patch = {};
  const strFields = [
    'title', 'speaker', 'description', 'agenda', 'location',
    'regStartDate', 'regStartTime', 'regEndDate', 'regEndTime',
    'eventStartDate', 'eventStartTime', 'eventEndDate', 'eventEndTime',
  ];
  strFields.forEach((f) => {
    const v = typeof parsed[f] === 'string' ? parsed[f].trim() : '';
    if (v) patch[f] = v;
  });
  if (parsed.category && String(parsed.category).trim()) {
    patch.category = normalizeEventCategory(parsed.category);
  }
  const slots = Number(parsed.maxSlots);
  if (Number.isFinite(slots) && slots > 0) patch.maxSlots = Math.round(slots);
  if (Array.isArray(parsed.learningOutcomes)) {
    const outcomes = parsed.learningOutcomes
      .map((s) => String(s || '').trim())
      .filter(Boolean);
    if (outcomes.length) patch.learningOutcomes = outcomes;
  }
  return patch;
};

/**
 * Dùng Gemini trích xuất thông tin sự kiện từ text thô của file.
 * @param {string} rawText
 * @returns {Promise<{ patch: object }>}
 */
const extractEventFromText = async (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) {
    throw new Error('Không có nội dung văn bản để trích xuất.');
  }

  const parsed = await extractJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `NỘI DUNG FILE KẾ HOẠCH:\n${text.slice(0, MAX_INPUT_CHARS)}`,
    temperature: 0.1,
    responseSchema: RESPONSE_SCHEMA,
  });

  return { patch: cleanPatch(parsed) };
};

module.exports = { extractEventFromText };
