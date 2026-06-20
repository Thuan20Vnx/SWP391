/**
 * API service cho ICPDP portal.
 * Dùng chung endpoint /api/ctsv/* (backend đã authorize đúng role).
 */
import { API_BASE, getAuthHeaders } from '../utils/api';

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Yêu cầu thất bại');
    err.status = res.status;
    throw err;
  }
  return data;
};

const icpdpFetch = (path, options = {}) =>
  fetch(`${API_BASE}/api/ctsv${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  }).then(parseJson);

/* ── Stats ── */
export const fetchIcpdpStats = () => icpdpFetch('/stats');

/* ── Performance ── */
export const fetchIcpdpPerformance = () => icpdpFetch('/performance');

/* ── Events (view-only) ── */
export const fetchIcpdpEvents = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v !== 'Tất cả') qs.set(k, v);
  });
  const q = qs.toString();
  return icpdpFetch(`/events${q ? `?${q}` : ''}`);
};

export const fetchIcpdpEvent = (id) => icpdpFetch(`/events/${id}`);

export const createIcpdpSchoolEvent = (body) =>
  icpdpFetch('/events', { method: 'POST', body: JSON.stringify(body) });

export const updateIcpdpSchoolEvent = (id, body) =>
  icpdpFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(body) });

/* ── Calendar ── */
export const fetchIcpdpCalendar = () => icpdpFetch('/events/calendar');

/* ── Reports ── */
export const fetchIcpdpReports = () => icpdpFetch('/reports');

/* ── Proposals (core ICPDP feature) ── */
export const fetchIcpdpProposals = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return icpdpFetch(`/proposals${qs ? `?${qs}` : ''}`);
};

export const fetchIcpdpProposal = (id) => icpdpFetch(`/proposals/${id}`);

/** Duyệt nội bộ ICPDP — đề xuất CLB liên kết sự kiện → pending_admin, còn lại → pending_ctsv */
export const icpdpApproveProposal = (id, note = '') =>
  icpdpFetch(`/proposals/${id}/icpdp-approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note })
  });

export const fetchIcpdpSemesterTimelines = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return icpdpFetch(`/semester-timelines${qs ? `?${qs}` : ''}`);
};

export const fetchIcpdpSemesterTimeline = (id) => icpdpFetch(`/semester-timelines/${id}`);

export const adminApproveSemesterTimeline = (id, note = '') =>
  icpdpFetch(`/semester-timelines/${id}/admin-approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const icpdpApproveSemesterTimeline = (id, note = '') =>
  icpdpFetch(`/semester-timelines/${id}/icpdp-approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const rejectIcpdpSemesterTimeline = (id, reason = '') =>
  icpdpFetch(`/semester-timelines/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });

export const revisionIcpdpSemesterTimeline = (id, note = '') =>
  icpdpFetch(`/semester-timelines/${id}/request-revision`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const icpdpApproveTimelineChangeRequest = (id, note = '') =>
  icpdpFetch(`/semester-timelines/${id}/change-request/icpdp-approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const rejectTimelineChangeRequest = (id, reason = '', stage = 'icpdp') =>
  icpdpFetch(`/semester-timelines/${id}/change-request/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason, stage }),
  });

export const fetchIcpdpPendingModerations = () =>
  icpdpFetch('/events/moderation/pending-icpdp');

export const icpdpApproveEventModeration = (id, note = '') =>
  icpdpFetch(`/events/${id}/moderation/icpdp-approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note })
  });

export const icpdpRejectEventModeration = (id, reason = '') =>
  icpdpFetch(`/events/${id}/moderation/icpdp-reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason })
  });

/* ── Profile & Settings ── */
export const loadIcpdpProfile = () => {
  try {
    const saved = localStorage.getItem('icpdp_profile');
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return {
    fullname: localStorage.getItem('userFullname') || 'Cán bộ IC-PDP',
    email: 'icpdp@fpt.edu.vn',
    department: 'Ban Công tác Đảng và Đoàn thể',
    title: 'Cán bộ Quản lý Câu lạc bộ',
    phone: '0988123456',
    about: 'Phụ trách xét duyệt và quản lý các hoạt động của Câu lạc bộ sinh viên tại cơ sở.'
  };
};

export const saveIcpdpProfile = (data) => {
  localStorage.setItem('icpdp_profile', JSON.stringify(data));
  if (data.fullname) localStorage.setItem('userFullname', data.fullname);
};

export const loadIcpdpNotificationPrefs = () => {
  try {
    const saved = localStorage.getItem('icpdp_notif_prefs');
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return {
    proposalSubmitted: true,
    eventApprovedByCtsv: true,
    reportSubmitted: true,
    systemAlerts: false
  };
};

export const saveIcpdpNotificationPrefs = (data) => {
  localStorage.setItem('icpdp_notif_prefs', JSON.stringify(data));
};

export const changeIcpdpPassword = (currentPassword, newPassword) =>
  fetch(`${API_BASE}/api/user/change-password`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  }).then(parseJson);
