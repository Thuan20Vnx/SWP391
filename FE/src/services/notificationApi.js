import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

export const fetchNotifications = async () => {
  const res = await fetch(`${API_BASE}/api/notifications`, {
    headers: getAuthHeaders()
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Không tải được thông báo.');
  }
  return data.notifications || [];
};

export const markNotificationRead = async (id) => {
  const res = await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Không thể đánh dấu đã đọc.');
  }
  return data.notification;
};

export const markAllRead = async () => {
  const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Không thể đánh dấu đã đọc tất cả.');
  }
  return data;
};

export const deleteNotification = async (id) => {
  const res = await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Không thể xóa thông báo.');
  }
  return data;
};

export const deleteAllNotifications = async () => {
  const res = await fetch(`${API_BASE}/api/notifications/all`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Không thể xóa tất cả thông báo.');
  }
  return data;
};

export const createNotificationSSE = (onMessage, onError) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    if (onError) onError(new Error('Chưa đăng nhập'));
    return null;
  }
  const url = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token)}`;
  const es = new EventSource(url);

  es.addEventListener('notification', (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (onMessage) onMessage(payload);
    } catch {
      // ignore parse errors
    }
  });

  es.addEventListener('connected', () => {
    // connected successfully
  });

  es.onerror = (err) => {
    if (onError) onError(err);
  };

  return es;
};
