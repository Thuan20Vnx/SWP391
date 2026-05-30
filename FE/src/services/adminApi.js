import { API_BASE, getAuthHeaders } from '../utils/api';

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Yêu cầu thất bại');
  }
  return data;
};

const adminFetch = (path, options = {}) =>
  fetch(`${API_BASE}/api/admin${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  }).then(parseJson);

export const fetchAdminPartners = (status = 'pending_admin') =>
  adminFetch(`/partners?status=${encodeURIComponent(status)}`);

export const approveAdminPartner = (id) =>
  adminFetch(`/partners/${id}/approve`, { method: 'PATCH', body: '{}' });

export const rejectAdminPartner = (id, reason = '') =>
  adminFetch(`/partners/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const fetchAdminSchoolEvents = (status = 'pending_admin') =>
  adminFetch(`/school-events?status=${encodeURIComponent(status)}`);

export const approveAdminSchoolEvent = (id) =>
  adminFetch(`/school-events/${id}/approve`, { method: 'PATCH', body: '{}' });

export const rejectAdminSchoolEvent = (id, reason = '') =>
  adminFetch(`/school-events/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });
