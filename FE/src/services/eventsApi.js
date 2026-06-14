import { API_BASE, getAuthHeaders } from '../utils/api';

export const fetchPublicEvents = async ({ q, search, category, club } = {}) => {
  const params = new URLSearchParams();
  const term = String(q || search || '').trim();
  if (term) params.set('q', term);
  if (category && category !== 'all' && category !== 'Tất cả') {
    params.set('category', category);
  }
  if (club?.trim()) params.set('club', club.trim());

  const qs = params.toString();
  const res = await fetch(`${API_BASE}/api/events${qs ? `?${qs}` : ''}`, {
    headers: getAuthHeaders(false),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Không thể tải danh sách sự kiện');
  }
  return data;
};
