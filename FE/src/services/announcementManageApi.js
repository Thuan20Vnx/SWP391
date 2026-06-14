import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';
import { cachedFetchDedup, invalidateCache } from '../utils/apiCache';

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
  cachedFetchDedup('announcements:managed', () =>
    manageFetch('').then((d) => d.announcements || []),
    { ttl: 60000 }
  );

export const fetchManagedAnnouncement = (id) =>
  manageFetch(`/${encodeURIComponent(id)}`).then((d) => d.announcement);

export const createManagedAnnouncement = (body) => {
  invalidateCache('announcements:managed');
  invalidateCache('announcements:public');
  return manageFetch('', { method: 'POST', body: JSON.stringify(body) }).then((d) => d.announcement);
};

export const updateManagedAnnouncement = (id, body) => {
  invalidateCache('announcements:managed');
  invalidateCache('announcements:public');
  return manageFetch(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }).then(
    (d) => d.announcement
  );
};

export const hideManagedAnnouncement = (id) => {
  invalidateCache('announcements:managed');
  invalidateCache('announcements:public');
  return manageFetch(`/${encodeURIComponent(id)}/hide`, { method: 'PATCH', body: '{}' }).then(
    (d) => d.announcement
  );
};

export const deleteManagedAnnouncement = (id) => {
  invalidateCache('announcements:managed');
  invalidateCache('announcements:public');
  return manageFetch(`/${encodeURIComponent(id)}/delete`, { method: 'POST', body: '{}' });
};
