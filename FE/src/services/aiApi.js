import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

/** Nhờ AI (Gemini) trích xuất thông tin sự kiện từ text thô của file. */
export const extractEventFromTextApi = async (text) => {
  const res = await fetch(`${API_BASE}/api/ai/extract-event`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'AI không trích xuất được thông tin.');
  }
  return data.patch || {};
};

/** Nhờ AI (Gemini) trích xuất kế hoạch timeline kỳ học từ text thô của file. */
export const extractTimelineFromTextApi = async (text) => {
  const res = await fetch(`${API_BASE}/api/ai/extract-timeline`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'AI không trích xuất được thông tin.');
  }
  return data.patch || {};
};
