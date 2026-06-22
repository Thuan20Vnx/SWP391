import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

export const sendChatbotMessage = async (messages, context = 'home') => {
  const res = await fetch(`${API_BASE}/api/chatbot/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Trợ lý ảo đang gặp sự cố, vui lòng thử lại sau.');
  }
  return {
    reply: data.reply,
    events: data.events || [],
    announcements: data.announcements || [],
    action: data.action || null,
  };
};

/** Đăng ký vé sự kiện thay cho người dùng (dùng cho hành động từ chatbot). */
export const registerEventFromChat = async (eventId) => {
  const res = await fetch(`${API_BASE}/api/events/${eventId}/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    const err = new Error(data.message || 'Không thể đăng ký sự kiện.');
    err.status = res.status;
    throw err;
  }
  return data;
};
