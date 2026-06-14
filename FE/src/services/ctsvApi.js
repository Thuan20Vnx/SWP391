import { API_BASE, getAuthHeaders } from '../utils/api';
import { buildFillRateHighlight } from '../constants/ctsvReportLabels';

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

export const requestCtsvEventModeration = (id, { action, reason, isWeatherPostpone = false }) =>
  ctsvFetch(`/events/${id}/moderation`, {
    method: 'PATCH',
    body: JSON.stringify({ action, reason, isWeatherPostpone })
  });

export const fetchCtsvCalendar = () => ctsvFetch('/events/calendar');

export const fetchCtsvReports = () => ctsvFetch('/reports');

export const fetchCtsvReportDetail = (id) => ctsvFetch(`/reports/${id}`);

export const DEMO_REPORT_EVENT_ID = 'demo-ended-event';

export const fetchCtsvProposals = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return ctsvFetch(`/proposals${qs ? `?${qs}` : ''}`);
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

export const fetchCtsvSemesterTimelines = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return ctsvFetch(`/semester-timelines${qs ? `?${qs}` : ''}`);
};

export const fetchCtsvSemesterTimeline = (id) => ctsvFetch(`/semester-timelines/${id}`);

export const approveCtsvSemesterTimeline = (id, note = '') =>
  ctsvFetch(`/semester-timelines/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const rejectCtsvSemesterTimeline = (id, reason = '') =>
  ctsvFetch(`/semester-timelines/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });

export const revisionCtsvSemesterTimeline = (id, note = '') =>
  ctsvFetch(`/semester-timelines/${id}/request-revision`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const adminApproveTimelineChangeRequest = (id, note = '') =>
  ctsvFetch(`/semester-timelines/${id}/change-request/admin-approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const rejectCtsvTimelineChangeRequest = (id, reason = '') =>
  ctsvFetch(`/semester-timelines/${id}/change-request/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason, stage: 'admin' }),
  });

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

export const requestInfoCtsvPartner = (id, reason = '') =>
  ctsvFetch(`/partners/${id}/request-info`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const approveCtsvContract = (id) =>
  ctsvFetch(`/contracts/${id}/approve`, { method: 'PATCH', body: '{}' });

export const fetchCtsvAnnouncements = () => ctsvFetch('/announcements');

/** Sự kiện cấp trường + đối tác đã duyệt (loại CLB / ICPDP). */
export const fetchCtsvAnnouncementLinkableEvents = () =>
  ctsvFetch('/events?forAnnouncement=1');

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

export const MOCK_EVENTS = [
  {
    id: 'ev-1',
    title: 'Đêm nhạc F-Fest: Giai điệu mùa hè',
    category: 'Âm nhạc',
    source: 'school',
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
    source: 'club',
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
    source: 'club',
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
    source: 'school',
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

export const MOCK_REPORT_DETAIL = {
  id: DEMO_REPORT_EVENT_ID,
  title: 'FPT Career Connect 2025 — Bản demo báo cáo',
  category: 'Công nghệ',
  eventType: 'Hội thảo & Workshop',
  source: 'school',
  date: '15/03/2025',
  time: '08:00',
  location: 'Sảnh tòa Gamma',
  campus: 'FPTU Đà Nẵng',
  status: 'ĐÃ KẾT THÚC',
  statusKey: 'ended',
  reportPhase: 'ended',
  isDemo: true,
  image:
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  stats: {
    totalCapacity: 200,
    registeredCount: 186,
    attendedCount: 172,
    cancelledCount: 8,
    noShowCount: 6,
    fillRate: 93,
    attendanceRate: 92,
    averageRating: 4.6,
    reviewCount: 124,
    totalRevenue: 0,
    studentRegistrations: 158,
    guestRegistrations: 28
  },
  ticketBreakdown: [
    { name: 'Vé sinh viên', sold: 158, capacity: 170, revenue: 0 },
    { name: 'Vé khách mời', sold: 28, capacity: 30, revenue: 0 }
  ],
  registrationTimeline: [
    { label: 'T-14 ngày', count: 24 },
    { label: 'T-7 ngày', count: 58 },
    { label: 'T-3 ngày', count: 42 },
    { label: 'T-1 ngày', count: 38 },
    { label: 'Ngày SK', count: 24 }
  ],
  ratingDistribution: [
    { stars: 5, count: 78 },
    { stars: 4, count: 32 },
    { stars: 3, count: 10 },
    { stars: 2, count: 3 },
    { stars: 1, count: 1 }
  ],
  recentReviews: [
    {
      rating: 5,
      comment: 'Chương trình rõ ràng, mentor nhiệt tình.',
      authorName: 'Nguyễn Văn A',
      createdAt: '2025-03-16T10:00:00.000Z'
    },
    {
      rating: 4,
      comment: 'Hữu ích cho sinh viên năm cuối tìm việc.',
      authorName: 'Trần Thị B',
      createdAt: '2025-03-16T11:30:00.000Z'
    }
  ],
  recentRegistrations: [
    { name: 'Phạm Minh D', email: 'dpm@fpt.edu.vn', status: 'attended', registeredAt: '01/03/2025' },
    { name: 'Hoàng Thị E', email: 'heth@fpt.edu.vn', status: 'attended', registeredAt: '03/03/2025' },
    { name: 'Vũ Văn F', email: 'vuvf@fpt.edu.vn', status: 'registered', registeredAt: '10/03/2025' }
  ],
  highlights: [
    buildFillRateHighlight(93),
    '124 đánh giá sau sự kiện, điểm TB 4.6/5.',
    '172/186 người đăng ký có mặt (check-in).'
  ]
};

export const MOCK_REPORTS = [
  {
    id: DEMO_REPORT_EVENT_ID,
    title: 'FPT Career Connect 2025 — Bản demo báo cáo',
    category: 'Công nghệ',
    source: 'school',
    date: '15/03/2025',
    time: '08:00',
    location: 'Sảnh tòa Gamma',
    registeredCount: 186,
    totalTickets: 200,
    attendanceRate: 93,
    status: 'ĐÃ KẾT THÚC',
    statusKey: 'ended',
    reportPhase: 'ended'
  },
  {
    id: 'ev-report-1',
    title: 'FPT Techday 2024: Kiến tạo tương lai số',
    category: 'Công nghệ',
    source: 'school',
    date: '25/10/2024',
    time: '08:00',
    location: 'Sảnh tòa Gamma',
    registeredCount: 180,
    totalTickets: 200,
    attendanceRate: 90,
    status: 'ĐÃ KẾT THÚC',
    statusKey: 'ended',
    reportPhase: 'ended'
  },
  {
    id: 'ev-report-2',
    title: 'Workshop: Kỹ năng tranh biện (Debate)',
    category: 'Học thuật',
    source: 'club',
    date: '10/05/2024',
    time: '14:00',
    location: 'Tầng 5 tòa Alpha',
    registeredCount: 50,
    totalTickets: 50,
    attendanceRate: 100,
    status: 'ĐÃ KẾT THÚC',
    statusKey: 'ended',
    reportPhase: 'ended'
  },
  {
    id: 'ev-report-3',
    title: 'Hackathon 2026: Innovate for Green',
    category: 'Công nghệ',
    source: 'club',
    date: '25/05/2026',
    time: '08:00',
    location: 'FPT Software Đà Nẵng',
    registeredCount: 30,
    totalTickets: 150,
    attendanceRate: 20,
    status: 'ĐANG DIỄN RA',
    statusKey: 'live',
    reportPhase: 'live'
  }
];
