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

/** Duyệt nội bộ ICPDP → chuyển pending_icpdp → pending_ctsv */
export const icpdpApproveProposal = (id, note = '') =>
  icpdpFetch(`/proposals/${id}/icpdp-approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note })
  });

/* ── Semester timelines ── */
export const fetchIcpdpSemesterTimelines = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return icpdpFetch(`/semester-timelines${qs ? `?${qs}` : ''}`);
};

export const fetchIcpdpSemesterTimeline = (id) => icpdpFetch(`/semester-timelines/${id}`);

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

/* ── Mock data ── */
export const ICPDP_MOCK_EVENTS = [
  {
    id: 'ev-1',
    title: 'Workshop: Kỹ năng thuyết trình',
    category: 'Workshop',
    source: 'club',
    date: '20/05/2026',
    time: '14:00',
    location: 'Hội trường A, FPTU',
    remainingTickets: 30,
    totalTickets: 50,
    status: 'CHỜ ICPDP',
    statusKey: 'pending_icpdp',
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'ev-2',
    title: 'Hackathon: Code for Good',
    category: 'Công nghệ',
    source: 'club',
    date: '22/05/2026',
    time: '08:00',
    location: 'Phòng Lab 301',
    remainingTickets: 40,
    totalTickets: 60,
    status: 'MỞ ĐĂNG KÝ',
    statusKey: 'approved',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'ev-3',
    title: 'Đêm nhạc CLB Guitar',
    category: 'Âm nhạc',
    source: 'club',
    date: '25/05/2026',
    time: '19:00',
    location: 'Sân chính FPTU',
    remainingTickets: 100,
    totalTickets: 200,
    status: 'ĐANG DIỄN RA',
    statusKey: 'live',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'
  }
];

export const ICPDP_MOCK_STATS = [
  { label: 'Đề xuất chờ duyệt', value: '8', trend: '+2 tuần này' },
  { label: 'Sự kiện CLB đang diễn ra', value: '3', trend: 'Ổn định' },
  { label: 'Sinh viên tham gia', value: '850', trend: '+12%' }
];

export const ICPDP_MOCK_REPORTS = [
  {
    id: 'ev-report-1',
    title: 'Workshop: Kỹ năng lãnh đạo',
    category: 'Workshop',
    source: 'club',
    date: '10/04/2026',
    time: '14:00',
    location: 'Phòng 201 FPTU',
    registeredCount: 45,
    totalTickets: 50,
    attendanceRate: 90,
    status: 'ĐÃ KẾT THÚC',
    statusKey: 'ended',
    reportPhase: 'ended'
  },
  {
    id: 'ev-report-2',
    title: 'Cuộc thi Debate Championship',
    category: 'Học thuật',
    source: 'club',
    date: '15/04/2026',
    time: '09:00',
    location: 'Hội trường B',
    registeredCount: 80,
    totalTickets: 100,
    attendanceRate: 80,
    status: 'ĐÃ KẾT THÚC',
    statusKey: 'ended',
    reportPhase: 'ended'
  }
];

export const ICPDP_PERFORMANCE = [
  { name: 'Đề xuất duyệt đúng hạn', rate: 95 },
  { name: 'CLB hoạt động tích cực', rate: 82 },
  { name: 'Báo cáo nộp đúng hạn', rate: 75 }
];

export const ICPDP_RECENT_ACTIVITY = [
  { id: 1, text: 'Duyệt đề xuất "Đêm nhạc Acoustic"', time: '2 giờ trước' },
  { id: 2, text: 'Tiếp nhận báo cáo từ CLB Lập trình', time: '5 giờ trước' },
  { id: 3, text: 'Hệ thống cập nhật lịch sự kiện tháng 6', time: '1 ngày trước' }
];

/* ── Profile & Settings Mocks ── */
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
