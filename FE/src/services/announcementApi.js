import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

export const fetchPublicAnnouncements = async (limit = 100) => {
  const res = await fetch(`${API_BASE}/api/announcements?limit=${limit}`, {
    headers: getAuthHeaders()
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Không tải được danh sách thông báo.');
  }
  return data.announcements || [];
};

export const fetchPublicAnnouncement = async (id) => {
  const res = await fetch(`${API_BASE}/api/announcements/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders()
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Không tìm thấy thông báo.');
  }
  return data.announcement;
};
