const eventService = require('./event.service');

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const HOME_SYSTEM_PROMPT = `Bạn là trợ lý ảo "F-Events" của nền tảng quản lý sự kiện sinh viên FPT.
Trả lời ngắn gọn, thân thiện, bằng tiếng Việt. Chỉ dùng thông tin sự kiện được cung cấp trong phần DỮ LIỆU SỰ KIỆN dưới đây — không bịa thêm sự kiện, thời gian, hay địa điểm.
Nếu người dùng hỏi về sự kiện và không có dữ liệu phù hợp, hãy nói rõ là chưa có thông tin đó.
Nếu câu hỏi không liên quan đến sự kiện (vd: chào hỏi, hỏi cách dùng web), trả lời tự nhiên, không cần nhắc tới dữ liệu sự kiện.`;

const formatEventsForPrompt = (events) => {
  if (!events.length) return 'Hiện chưa có sự kiện công khai nào trong hệ thống.';
  return events
    .slice(0, 30)
    .map((e, i) => {
      const start = e.startDate ? new Date(e.startDate).toLocaleString('vi-VN') : 'chưa rõ';
      return `${i + 1}. "${e.title}" | Danh mục: ${e.category || 'khác'} | Bắt đầu: ${start} | Địa điểm: ${e.location || e.campus || 'chưa rõ'} | Vé còn lại: ${Math.max((e.totalTickets || e.capacity || 0) - (e.registeredCount || 0), 0)}`;
    })
    .join('\n');
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
  };
};

const getReply = async ({ messages, context }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trên server.');
  }

  const { events } = await eventService.getApprovedEvents({});
  const eventsBlock = formatEventsForPrompt(events || []);
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
  const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();

  if (!reply) {
    throw new Error('Gemini không trả về nội dung hợp lệ.');
  }

  return reply;
};

module.exports = { getReply };
