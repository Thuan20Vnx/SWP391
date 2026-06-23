const eventService = require('./event.service');
const Announcement = require('../models/Announcement');
const { PUBLIC_ANNOUNCEMENT_FILTER } = require('../utils/announcementFormat');
const { fetchCurrentWeather } = require('./weather.service');

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const HOME_SYSTEM_PROMPT = `Bạn là trợ lý ảo "F-Events" của nền tảng quản lý sự kiện sinh viên FPT.
Trả lời ngắn gọn, thân thiện, bằng tiếng Việt, dùng Markdown đơn giản (đoạn văn ngắn, gạch đầu dòng "-" khi liệt kê, **in đậm** tên sự kiện/thông báo).
Chỉ dùng thông tin trong phần DỮ LIỆU dưới đây — không bịa thêm sự kiện, thông báo, thời gian hay địa điểm.
Nếu người dùng hỏi và không có dữ liệu phù hợp, hãy nói rõ là chưa có thông tin đó.
Nếu câu hỏi không liên quan (chào hỏi, hỏi cách dùng web), trả lời tự nhiên.

Quy tắc tham chiếu (rất quan trọng — để hệ thống hiển thị ô điều hướng cho người dùng):
- Mỗi SỰ KIỆN có mã "E#<n>". Khi bạn nhắc tới / gợi ý một sự kiện cụ thể, thêm số <n> vào mảng "eventRefs".
- Mỗi THÔNG BÁO có mã "A#<n>". Khi bạn nhắc tới / gợi ý một thông báo cụ thể, thêm số <n> vào mảng "announcementRefs".
- Khi người dùng yêu cầu ĐĂNG KÝ / MUA VÉ một sự kiện cụ thể (vd: "đăng ký vé Miss grand", "cho mình đăng ký sự kiện X"), đặt mã số <n> của đúng sự kiện đó vào "registerEventRef" (chỉ một số). Trong câu trả lời, xác nhận ngắn gọn rằng bạn đang đăng ký giúp. Nếu không chắc người dùng muốn sự kiện nào, hãy hỏi lại thay vì đặt registerEventRef.`;

const formatEventsForPrompt = (events) => {
  if (!events.length) return 'Hiện chưa có sự kiện công khai nào.';
  return events
    .slice(0, 30)
    .map((e, i) => {
      const start = e.startDate ? new Date(e.startDate).toLocaleString('vi-VN') : 'chưa rõ';
      const remaining = Math.max((e.totalTickets || e.capacity || 0) - (e.registeredCount || 0), 0);
      return `E#${i + 1} "${e.title}" | Danh mục: ${e.category || 'khác'} | Bắt đầu: ${start} | Địa điểm: ${e.location || e.campus || 'chưa rõ'} | Vé còn lại: ${remaining}`;
    })
    .join('\n');
};

const formatAnnouncementsForPrompt = (anns) => {
  if (!anns.length) return 'Hiện chưa có thông báo công khai nào.';
  return anns
    .slice(0, 20)
    .map((a, i) => {
      const when = a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('vi-VN') : 'chưa rõ';
      const snippet = String(a.content || '').replace(/\s+/g, ' ').slice(0, 100);
      return `A#${i + 1} "${a.title}" | Ngày: ${when} | ${snippet}`;
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
      description: 'Số n của các sự kiện (E#n) được nhắc tới/gợi ý',
    },
    announcementRefs: {
      type: 'array',
      items: { type: 'integer' },
      description: 'Số n của các thông báo (A#n) được nhắc tới/gợi ý',
    },
    registerEventRef: {
      type: 'integer',
      description: 'Số n của sự kiện mà người dùng muốn đăng ký/mua vé (E#n). 0 nếu không có.',
    },
  },
  required: ['reply', 'eventRefs', 'announcementRefs', 'registerEventRef'],
};

const buildContents = (history, context, dataBlock) => {
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
      parts: [{ text: `${systemPrompt}\n\n${dataBlock}` }],
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

  const [{ events } = {}, annList, weather] = await Promise.all([
    eventService.getApprovedEvents({}),
    Announcement.find(PUBLIC_ANNOUNCEMENT_FILTER)
      .select('title content publishedAt')
      .sort({ publishedAt: -1 })
      .limit(20)
      .lean()
      .catch(() => []),
    fetchCurrentWeather().catch(() => null),
  ]);

  const eventList = (events || []).slice(0, 30);
  const annItems = annList || [];
  const weatherBlock = weather
    ? `DỮ LIỆU THỜI TIẾT HIỆN TẠI (Đà Nẵng, thời điểm thực tế, KHÔNG phải dự báo cho ngày khác): ${weather.description}, ${weather.temp}°C (cảm giác như ${weather.feelsLike}°C), độ ẩm ${weather.humidity}%, gió ${weather.windSpeed} m/s. Nếu người dùng hỏi thời tiết cho một sự kiện sắp diễn ra, dùng dữ liệu này để trả lời và nói rõ đây là thời tiết hiện tại (không phải dự báo chính xác cho thời điểm sự kiện nếu sự kiện ở ngày khác).`
    : 'DỮ LIỆU THỜI TIẾT HIỆN TẠI: chưa lấy được dữ liệu thời tiết.';
  const dataBlock = `DỮ LIỆU SỰ KIỆN HIỆN CÓ:\n${formatEventsForPrompt(eventList)}\n\nDỮ LIỆU THÔNG BÁO HIỆN CÓ:\n${formatAnnouncementsForPrompt(annItems)}\n\n${weatherBlock}`;

  const body = buildContents(messages || [], context, dataBlock);

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
    return { reply: rawText, events: [], announcements: [], action: null };
  }

  const eventRefs = Array.isArray(parsed.eventRefs) ? parsed.eventRefs : [];
  const suggestedEvents = eventRefs
    .map((ref) => eventList[ref - 1])
    .filter(Boolean)
    .map((e) => ({ id: String(e._id), title: e.title, startDate: e.startDate, location: e.location || e.campus }));

  const annRefs = Array.isArray(parsed.announcementRefs) ? parsed.announcementRefs : [];
  const suggestedAnnouncements = annRefs
    .map((ref) => annItems[ref - 1])
    .filter(Boolean)
    .map((a) => ({ id: String(a._id), title: a.title, publishedAt: a.publishedAt }));

  let action = null;
  const regRef = Number(parsed.registerEventRef) || 0;
  if (regRef > 0 && eventList[regRef - 1]) {
    const target = eventList[regRef - 1];
    action = { type: 'register_event', eventId: String(target._id), eventTitle: target.title };
  }

  return {
    reply: parsed.reply || rawText,
    events: suggestedEvents,
    announcements: suggestedAnnouncements,
    action,
  };
};

module.exports = { getReply };
