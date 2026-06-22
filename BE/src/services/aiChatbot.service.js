const eventService = require('./event.service');

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const HOME_SYSTEM_PROMPT = `Bạn là trợ lý ảo "F-Events" của nền tảng quản lý sự kiện sinh viên FPT.
Trả lời ngắn gọn, thân thiện, bằng tiếng Việt, dùng Markdown đơn giản (đoạn văn ngắn, gạch đầu dòng "-" khi liệt kê nhiều sự kiện, **in đậm** tên sự kiện).
Chỉ dùng thông tin sự kiện được cung cấp trong phần DỮ LIỆU SỰ KIỆN dưới đây — không bịa thêm sự kiện, thời gian, hay địa điểm.
Nếu người dùng hỏi về sự kiện và không có dữ liệu phù hợp, hãy nói rõ là chưa có thông tin đó.
Nếu câu hỏi không liên quan đến sự kiện (vd: chào hỏi, hỏi cách dùng web), trả lời tự nhiên, không cần nhắc tới dữ liệu sự kiện.
Mỗi sự kiện trong dữ liệu có một mã số "#<n>" — khi bạn nhắc tới hoặc gợi ý một sự kiện cụ thể trong câu trả lời, hãy thêm mã số đó vào mảng "eventRefs" của kết quả JSON.`;

const formatEventsForPrompt = (events) => {
  if (!events.length) return 'Hiện chưa có sự kiện công khai nào trong hệ thống.';
  return events
    .slice(0, 30)
    .map((e, i) => {
      const start = e.startDate ? new Date(e.startDate).toLocaleString('vi-VN') : 'chưa rõ';
      const remaining = Math.max((e.totalTickets || e.capacity || 0) - (e.registeredCount || 0), 0);
      return `#${i + 1} "${e.title}" | Danh mục: ${e.category || 'khác'} | Bắt đầu: ${start} | Địa điểm: ${e.location || e.campus || 'chưa rõ'} | Vé còn lại: ${remaining}`;
    })
    .join('\n');
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Câu trả lời dạng Markdown cho người dùng' },
    eventRefs: {
      type: 'array',
      items: { type: 'integer' },
      description: 'Mã số #n của các sự kiện được nhắc tới/gợi ý trong câu trả lời, lấy từ DỮ LIỆU SỰ KIỆN',
    },
  },
  required: ['reply', 'eventRefs'],
};

const buildContents = (history, context, eventsBlock) => {
  const systemPrompt =
    context === 'admin'
      ? `${HOME_SYSTEM_PROMPT}\nNgười dùng hiện tại là ADMIN/quản trị viên, có thể hỏi về quy trình duyệt đề xuất, xử lý yêu cầu sửa/ẩn/xóa, quản lý tài khoản.`
      : HOME_SYSTEM_PROMPT;

  const contents = history
    .filter((m) => m.text && m.text.trim())
    .slice(-10)
    .map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

  return {
    systemInstruction: {
      parts: [{ text: `${systemPrompt}\n\nDỮ LIỆU SỰ KIỆN HIỆN CÓ:\n${eventsBlock}` }],
    },
    contents,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };
};

const getReply = async ({ messages, context }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trên server.');
  }

  const { events } = await eventService.getApprovedEvents({});
  const eventList = (events || []).slice(0, 30);
  const eventsBlock = formatEventsForPrompt(eventList);
  const body = buildContents(messages || [], context, eventsBlock);

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API lỗi (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();

  if (!rawText) {
    throw new Error('Gemini không trả về nội dung hợp lệ.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { reply: rawText, events: [] };
  }

  const refs = Array.isArray(parsed.eventRefs) ? parsed.eventRefs : [];
  const suggestedEvents = refs
    .map((ref) => eventList[ref - 1])
    .filter(Boolean)
    .map((e) => ({ id: e._id, title: e.title, startDate: e.startDate, location: e.location || e.campus }));

  return { reply: parsed.reply || rawText, events: suggestedEvents };
};

module.exports = { getReply };
