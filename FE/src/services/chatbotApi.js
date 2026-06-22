import { API_BASE, parseApiResponse } from '../utils/api';

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
  return { reply: data.reply, events: data.events || [] };
};
