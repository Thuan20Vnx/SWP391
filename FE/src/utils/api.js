const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export const getAuthHeaders = (json = true) => {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('authToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const activeClubId = localStorage.getItem('activeManagedClubId');
  if (activeClubId) headers['X-Managed-Club-Id'] = activeClubId;
  return headers;
};

/** Alias used by club management pages */
export const getEventHeaders = getAuthHeaders;

/** Parse JSON API response; surfaces server message when available */
export const parseApiResponse = async (res) => {
  const text = await res.text();
  if (!text) {
    return {
      ok: res.ok,
      status: res.status,
      data: { success: false, message: res.ok ? '' : 'Máy chủ không trả về dữ liệu.' }
    };
  }
  try {
    const data = JSON.parse(text);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: res.status,
      data: {
        success: false,
        message: res.ok
          ? 'Phản hồi máy chủ không hợp lệ.'
          : `Lỗi máy chủ (${res.status}). Vui lòng thử lại.`
      }
    };
  }
};

export { API_BASE };

export const requestClubEventModeration = async (eventId, body) => {
  const res = await fetch(`${API_BASE}/api/events/${eventId}/moderation`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body)
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Gửi yêu cầu thất bại.');
  }
  return data;
};
