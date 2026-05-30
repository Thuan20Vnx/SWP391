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

const ctsvFetch = (path, options = {}) =>
  fetch(`${API_BASE}/api/ctsv${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  }).then(parseJson);

export const fetchCtsvStats = () => ctsvFetch('/stats');

export const fetchCtsvEvents = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v !== 'Tất cả') qs.set(k, v);
  });
  const q = qs.toString();
  return ctsvFetch(`/events${q ? `?${q}` : ''}`);
};

export const fetchCtsvEvent = (id) => ctsvFetch(`/events/${id}`);

export const createCtsvEvent = (body) =>
  ctsvFetch('/events', { method: 'POST', body: JSON.stringify(body) });

export const updateCtsvEvent = (id, body) =>
  ctsvFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(body) });

export const approveCtsvEvent = (id, note = '') =>
  ctsvFetch(`/events/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ note }) });

export const rejectCtsvEvent = (id, reason = '') =>
  ctsvFetch(`/events/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const revisionCtsvEvent = (id, note = '') =>
  ctsvFetch(`/events/${id}/request-revision`, { method: 'PATCH', body: JSON.stringify({ note }) });

export const publishCtsvEvent = (id) =>
  ctsvFetch(`/events/${id}/publish`, { method: 'PATCH', body: '{}' });

export const fetchCtsvCalendar = () => ctsvFetch('/events/calendar');

export const fetchCtsvReports = () => ctsvFetch('/reports');

export const fetchCtsvProposals = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return ctsvFetch(`/proposals${qs ? `?${qs}` : ''}`);
};

export const fetchCtsvProposal = (id) => ctsvFetch(`/proposals/${id}`);

export const approveCtsvProposal = (id, note = '') =>
  ctsvFetch(`/proposals/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ note }) });

export const rejectCtsvProposal = (id, reason = '') =>
  ctsvFetch(`/proposals/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const revisionCtsvProposal = (id, note = '') =>
  ctsvFetch(`/proposals/${id}/request-revision`, { method: 'PATCH', body: JSON.stringify({ note }) });

export const fetchCtsvPartners = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return ctsvFetch(`/partners${qs ? `?${qs}` : ''}`);
};

export const fetchCtsvPartner = (id) => ctsvFetch(`/partners/${id}`);

export const createCtsvPartner = (body) =>
  ctsvFetch('/partners', { method: 'POST', body: JSON.stringify(body) });

export const approveCtsvPartner = (id) =>
  ctsvFetch(`/partners/${id}/approve`, { method: 'PATCH', body: '{}' });

export const rejectCtsvPartner = (id, reason = '') =>
  ctsvFetch(`/partners/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const approveCtsvContract = (id) =>
  ctsvFetch(`/contracts/${id}/approve`, { method: 'PATCH', body: '{}' });

export const fetchCtsvAnnouncements = () => ctsvFetch('/announcements');

export const publishCtsvAnnouncement = (body) =>
  ctsvFetch('/announcements', { method: 'POST', body: JSON.stringify(body) });

export const hideCtsvAnnouncement = (id) =>
  ctsvFetch(`/announcements/${id}/hide`, { method: 'PATCH', body: '{}' });

export const deleteCtsvAnnouncement = (id) =>
  ctsvFetch(`/announcements/${id}`, { method: 'DELETE' });

export const MOCK_EVENTS = [
  {
    id: 'ev-1',
    title: 'Đêm nhạc F-Fest: Giai điệu mùa hè',
    category: 'Âm nhạc',
    date: '20/05/2026',
    time: '19:00',
    location: 'FPT Plaza 2, Đà Nẵng',
    remainingTickets: 15,
    totalTickets: 200,
    status: 'CHỜ CTSV DUYỆT',
    statusKey: 'pending_ctsv',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'ev-2',
    title: 'Làm chủ Prompt Engineering với AI',
    category: 'Workshop',
    date: '22/05/2026',
    time: '14:00',
    location: 'Hội trường A, FPT Tower',
    remainingTickets: 40,
    totalTickets: 50,
    status: 'MỞ ĐĂNG KÝ',
    statusKey: 'approved',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'ev-3',
    title: 'Hackathon 2026: Innovate for Green',
    category: 'Công nghệ',
    date: '25/05/2026',
    time: '08:00',
    location: 'FPT Software Đà Nẵng',
    remainingTickets: 120,
    totalTickets: 150,
    status: 'ĐANG DIỄN RA',
    statusKey: 'live',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'ev-4',
    title: 'Career Fair: Kết nối doanh nghiệp',
    category: 'Kết nối',
    date: '28/05/2026',
    time: '09:00',
    location: 'Sân bóng FPTU',
    remainingTickets: 300,
    totalTickets: 500,
    status: 'CHỜ CTSV DUYỆT',
    statusKey: 'pending_ctsv',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80'
  }
];

export const MOCK_STATS = [
  { label: 'Sự kiện chờ duyệt', value: '12', trend: '+3 tuần này' },
  { label: 'Sự kiện đang diễn ra', value: '5', trend: 'Ổn định' },
  { label: 'Sinh viên tham gia', value: '1.2K', trend: '+8%' }
];
