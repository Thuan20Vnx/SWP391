import { API_BASE, getAuthHeaders } from '../utils/api';
import { buildFillRateHighlight } from '../constants/ctsvReportLabels';
import { cachedFetchDedup, invalidateCache } from '../utils/apiCache';

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Yêu cầu thất bại');
    err.status = res.status;
    throw err;
  }
  return data;
};

const ctsvFetch = (path, options = {}) =>
  fetch(`${API_BASE}/api/ctsv${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  }).then(parseJson);

export const fetchCtsvStats = () =>
  cachedFetchDedup('ctsv:stats', () => ctsvFetch('/stats'), { ttl: 60000 });

export const fetchCtsvEvents = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v !== 'Tất cả') qs.set(k, v);
  });
  const q = qs.toString();
  const path = `/events${q ? `?${q}` : ''}`;
  return cachedFetchDedup(`ctsv:events:${q}`, () => ctsvFetch(path), { ttl: 45000 });
};

export const fetchCtsvEvent = (id) => ctsvFetch(`/events/${id}`);

export const fetchCtsvApprovedEvents = ({ source = '', search = '', page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (source && source !== 'all') params.set('source', source);
  if (search) params.set('search', search);
  return ctsvFetch(`/events/approved?${params}`);
};

export const createCtsvEvent = (body) => {
  invalidateCache('ctsv:events');
  invalidateCache('ctsv:stats');
  invalidateCache('ctsv:calendar');
  invalidateCache('events:linkable');
  return ctsvFetch('/events', { method: 'POST', body: JSON.stringify(body) });
};

export const updateCtsvEvent = (id, body) => {
  invalidateCache('ctsv:events');
  invalidateCache('ctsv:stats');
  invalidateCache('ctsv:calendar');
  invalidateCache('events:linkable');
  return ctsvFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(body) });
};

export const approveCtsvEvent = (id, note = '') =>
  ctsvFetch(`/events/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ note }) });

export const rejectCtsvEvent = (id, reason = '') =>
  ctsvFetch(`/events/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const revisionCtsvEvent = (id, note = '') =>
  ctsvFetch(`/events/${id}/request-revision`, { method: 'PATCH', body: JSON.stringify({ note }) });

export const publishCtsvEvent = (id) =>
  ctsvFetch(`/events/${id}/publish`, { method: 'PATCH', body: '{}' });

export const requestCtsvEventModeration = (id, { action, reason, isWeatherPostpone = false }) =>
  ctsvFetch(`/events/${id}/moderation`, {
    method: 'PATCH',
    body: JSON.stringify({ action, reason, isWeatherPostpone })
  });

export const fetchCtsvCalendar = () =>
  cachedFetchDedup('ctsv:calendar', () => ctsvFetch('/events/calendar'), { ttl: 60000 });

export const fetchCtsvReports = () =>
  cachedFetchDedup('ctsv:reports', () => ctsvFetch('/reports'), { ttl: 60000 });

export const fetchCtsvReportDetail = (id) => ctsvFetch(`/reports/${id}`);

/** Gửi báo cáo: SK đối tác → Partner + Admin; các SK khác → Admin */
export const submitCtsvReport = (id) =>
  ctsvFetch(`/reports/${id}/submit-admin`, { method: 'POST', body: '{}' });

/** @deprecated dùng submitCtsvReport */
export const submitCtsvReportToAdmin = submitCtsvReport;

export const fetchCtsvProposals = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = `/proposals${qs ? `?${qs}` : ''}`;
  return cachedFetchDedup(`ctsv:proposals:${qs}`, () => ctsvFetch(path), { ttl: 45000 });
};

export const fetchCtsvProposal = (id) => ctsvFetch(`/proposals/${id}`);

export const approveCtsvProposal = (id, note = '') =>
  ctsvFetch(`/proposals/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ note }) });

export const icpdpApproveProposal = (id, note = '') =>
  ctsvFetch(`/proposals/${id}/icpdp-approve`, { method: 'PATCH', body: JSON.stringify({ note }) });

export const rejectCtsvProposal = (id, reason = '') =>
  ctsvFetch(`/proposals/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const revisionCtsvProposal = (id, note = '') =>
  ctsvFetch(`/proposals/${id}/request-revision`, { method: 'PATCH', body: JSON.stringify({ note }) });

export const fetchCtsvPartners = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = `/partners${qs ? `?${qs}` : ''}`;
  return cachedFetchDedup(`ctsv:partners:${qs}`, () => ctsvFetch(path), { ttl: 45000 });
};

export const fetchCtsvPartner = (id) => ctsvFetch(`/partners/${id}`);

export const createCtsvPartner = (body) =>
  ctsvFetch('/partners', { method: 'POST', body: JSON.stringify(body) });

export const approveCtsvPartner = (id) =>
  ctsvFetch(`/partners/${id}/approve`, { method: 'PATCH', body: '{}' });

export const rejectCtsvPartner = (id, reason = '') =>
  ctsvFetch(`/partners/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const requestInfoCtsvPartner = (id, reason = '') =>
  ctsvFetch(`/partners/${id}/request-info`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const approveCtsvContract = (id) =>
  ctsvFetch(`/contracts/${id}/approve`, { method: 'PATCH', body: '{}' });

export const fetchCtsvAnnouncements = () =>
  cachedFetchDedup('ctsv:announcements', () => ctsvFetch('/announcements'), { ttl: 60000 });

/** Sự kiện cấp trường + đối tác đã duyệt (loại CLB / ICPDP). */
export const fetchCtsvAnnouncementLinkableEvents = () =>
  cachedFetchDedup('events:linkable', () => ctsvFetch('/events?forAnnouncement=1'), { ttl: 60000 });

export const publishCtsvAnnouncement = (body) =>
  ctsvFetch('/announcements', { method: 'POST', body: JSON.stringify(body) });

export const hideCtsvAnnouncement = (id) => {
  const safeId = encodeURIComponent(String(id || '').trim());
  return ctsvFetch(`/announcements/${safeId}/hide`, { method: 'PATCH', body: '{}' });
};

export const deleteCtsvAnnouncement = (id) => {
  const safeId = encodeURIComponent(String(id || '').trim());
  if (!safeId || safeId === 'undefined' || safeId === 'null') {
    return Promise.reject(new Error('Không xác định được thông báo.'));
  }
  return ctsvFetch(`/announcements/${safeId}/delete`, { method: 'POST', body: '{}' });
};

export const adminApproveTimelineChangeRequest = (id, note = '') =>
  ctsvFetch(`/semester-timelines/${id}/change-request/admin-approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const rejectCtsvTimelineChangeRequest = (id, reason = '', stage = 'admin') =>
  ctsvFetch(`/semester-timelines/${id}/change-request/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason, stage }),
  });
