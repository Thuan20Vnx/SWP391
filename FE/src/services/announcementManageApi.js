import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

const manageFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}/api/announcements/manage${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    }
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Yêu cầu thất bại');
  }
  return data;
};

export const fetchManagedAnnouncements = () =>
  manageFetch('').then((d) => d.announcements || []);

export const createManagedAnnouncement = (body) =>
  manageFetch('', { method: 'POST', body: JSON.stringify(body) }).then((d) => d.announcement);

export const updateManagedAnnouncement = (id, body) =>
  manageFetch(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }).then(
    (d) => d.announcement
  );

export const hideManagedAnnouncement = (id) =>
  manageFetch(`/${encodeURIComponent(id)}/hide`, { method: 'PATCH', body: '{}' }).then(
    (d) => d.announcement
  );

export const deleteManagedAnnouncement = (id) =>
  manageFetch(`/${encodeURIComponent(id)}/delete`, { method: 'POST', body: '{}' });
