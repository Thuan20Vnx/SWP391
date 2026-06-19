import { API_BASE, getAuthHeaders } from '../utils/api';
import { buildCoreEventPayload } from '../utils/eventFormState';

const COMPANY_STORAGE_KEY = 'fevents_partner_company';
const NOTIFY_STORAGE_KEY = 'fevents_partner_notifications';

export const PARTNER_MOCK_STATS = [
  { label: 'Tổng số sự kiện', value: '12', trend: '+2 tháng này' },
  { label: 'Tổng lượt đăng ký', value: '3,450', trend: '+12.4%' },
  { label: 'Sự kiện sắp diễn ra', value: '02', trend: 'Sắp khởi động trong 48h' },
  { label: 'Tổng doanh thu tài trợ', value: '150M VNĐ', trend: 'Kỳ hiện tại' }
];

export const PARTNER_MOCK_EVENTS = [
  {
    id: 'p-ev-1',
    title: 'Tech Talk 2026 — FPT Software',
    category: 'Công nghệ',
    date: '15/06/2026',
    time: '14:00',
    location: 'Hội trường Alpha',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    remainingTickets: 120,
    totalTickets: 200,
    status: 'MỞ ĐĂNG KÝ',
    statusKey: 'approved',
    source: 'partner'
  },
  {
    id: 'p-ev-2',
    title: 'FPT Recruitment Day 2026',
    category: 'Kết nối',
    date: '22/06/2026',
    time: '09:00',
    location: 'Sân FPT',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80',
    remainingTickets: 80,
    totalTickets: 150,
    status: 'CHỜ ADMIN DUYỆT',
    statusKey: 'pending_admin',
    source: 'partner'
  }
];

export const PARTNER_MOCK_CONTRACTS = [
  {
    id: 'c-mock-1',
    title: 'Tech Talk 2026 — FPT Software',
    amount: 50000000,
    status: 'approved',
    partnerName: 'FPT Software',
    createdAt: new Date().toISOString()
  }
];

export const PARTNER_MOCK_REPORTS = [
  {
    id: 'demo-ended-event',
    title: 'Tech Talk 2026 — Demo báo cáo',
    category: 'Công nghệ',
    date: '15/06/2026',
    location: 'Hội trường Alpha',
    registeredCount: 85,
    totalTickets: 100,
    attendanceRate: 85,
    status: 'Đã kết thúc',
    statusKey: 'ended',
    reportPhase: 'ended',
    source: 'partner'
  }
];

export const DEFAULT_PARTNER_COMPANY = {
  companyName: '',
  taxId: '',
  representative: '',
  email: '',
  phone: '',
  address: '',
  logo: ''
};

export const DEFAULT_PARTNER_NOTIFICATIONS = {
  proposalUpdates: true,
  monthlyReportEmail: true,
  newReviewAlerts: true
};

export const PARTNER_RECENT_ACTIVITY = [
  {
    id: 1,
    text: 'CTSV đã phê duyệt đề xuất sự kiện: Tech Talk 2026',
    time: '10 phút trước'
  },
  {
    id: 2,
    text: 'Thanh toán hợp đồng tài trợ thành công — Mã HD9928',
    time: '2 giờ trước'
  },
  {
    id: 3,
    text: "Sự kiện 'Tuyển dụng FPT Software' đã được publish lên trang chủ",
    time: 'Hôm qua'
  }
];

export const PARTNER_PERFORMANCE = [
  { name: 'Tech Talk 2026', rate: 95 },
  { name: 'FPT Recruitment', rate: 72 },
  { name: 'AI Workshop', rate: 60 }
];

export const DEMO_REPORT_EVENT_ID = 'demo-ended-event';

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Yêu cầu thất bại');
    err.status = res.status;
    throw err;
  }
  return data;
};

const partnerFetch = (path, options = {}) =>
  fetch(`${API_BASE}/api/partner${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  }).then(parseJson);

let partnerMeInflight = null;

export const fetchPartnerMe = async () => {
  if (partnerMeInflight) return partnerMeInflight;

  partnerMeInflight = (async () => {
    const res = await fetch(`${API_BASE}/api/partner/me`, {
      headers: getAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) {
      return { success: true, partner: null, proposals: [], hasProfile: false };
    }
    if (res.status === 401 || res.status === 403) {
      const err = new Error(data.message || 'Không có quyền truy cập hồ sơ đối tác.');
      err.status = res.status;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(data.message || 'Yêu cầu thất bại');
      err.status = res.status;
      throw err;
    }
    return data;
  })();

  try {
    return await partnerMeInflight;
  } finally {
    partnerMeInflight = null;
  }
};

export const updatePartnerMe = (body) =>
  partnerFetch('/me', { method: 'PATCH', body: JSON.stringify(body) });

export const updatePartnerLogo = (logo) =>
  updatePartnerMe({ logo: logo || '' });

export const fetchPartnerUserProfile = async () => {
  const res = await fetch(`${API_BASE}/api/user/profile`, {
    headers: getAuthHeaders(false)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Không tải được hồ sơ người dùng.');
    err.status = res.status;
    throw err;
  }
  return data;
};

export const updatePartnerUserProfile = async (body) => {
  const res = await fetch(`${API_BASE}/api/user/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body)
  });
  return parseJson(res);
};

export const fetchPartnerStats = () => partnerFetch('/stats');

export const fetchPartnerEvents = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v !== 'Tất cả') qs.set(k, v);
  });
  const q = qs.toString();
  return partnerFetch(`/events${q ? `?${q}` : ''}`);
};

export const fetchPartnerEvent = (id) => partnerFetch(`/events/${id}`);

export const fetchPartnerCalendar = () => partnerFetch('/events/calendar');

export const fetchPartnerContracts = () => partnerFetch('/contracts');

export const fetchPartnerReports = () => partnerFetch('/reports');

export const fetchPartnerReportDetail = (id) => partnerFetch(`/reports/${id}`);

export const fetchPartnerProposals = () => partnerFetch('/proposals');

export const createPartnerProposal = (body) =>
  partnerFetch('/proposals', { method: 'POST', body: JSON.stringify(body) });

export const supplementPartnerProposal = (id, body) =>
  partnerFetch(`/proposals/${id}/supplement`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });

export const fetchPartnerActiveEventRequest = () => partnerFetch('/event-requests/active');

export const savePartnerEventRequestDraft = (body) =>
  partnerFetch('/event-requests/draft', { method: 'PUT', body: JSON.stringify(body) });

export const submitPartnerEventRequest = (body) =>
  partnerFetch('/event-requests/submit', { method: 'POST', body: JSON.stringify(body) });

export const cancelPartnerEventRequest = (id) =>
  partnerFetch(`/event-requests/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) });

export const updatePartnerEventRequest = (id, body) =>
  partnerFetch(`/event-requests/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

export const hidePartnerEventRequest = (id) =>
  partnerFetch(`/event-requests/${id}/hide`, { method: 'PATCH', body: JSON.stringify({}) });

export const deletePartnerEventRequest = (id) =>
  partnerFetch(`/event-requests/${id}`, { method: 'DELETE' });

export const buildPartnerEventRequestPayload = ({
  company,
  form,
  benefits,
  partnerMessage,
  attachments,
  bannerFileName,
  requestId
}) => {
  const core = buildCoreEventPayload(form);

  return {
    requestId: requestId || undefined,
    companyName: company.companyName,
    partnerCode: company.partnerCode,
    representative: company.representative,
    representativeTitle: company.representativeTitle,
    phone: company.phone,
    address: company.address,
    category: core.category,
    expectedSponsorAmount: Number(company.expectedSponsorAmount) || 0,
    benefits: benefits.filter((b) => b.trim()),
    partnerMessage,
    attachments,
    title: core.title,
    proposedEventTitle: core.title,
    eventType: core.eventType,
    description: core.description,
    registrationStartDate: core.registrationStartDate,
    registrationEndDate: core.registrationEndDate,
    startDate: core.startDate,
    endDate: core.endDate,
    duration: core.duration,
    format: core.format,
    location: core.location,
    campus: 'FPT University',
    agenda: core.agenda,
    learningOutcomes: core.learningOutcomes,
    expectedAttendees: core.expectedAttendees,
    image: core.image,
    bannerFileName,
    totalTickets: core.totalTickets,
    ticketTypes: core.ticketTypes,
    speakers: core.speakers
  };
};

export const loadPartnerCompanyProfile = () => {
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (raw) return { ...DEFAULT_PARTNER_COMPANY, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  const email = localStorage.getItem('userEmail') || '';
  const name = localStorage.getItem('userFullname') || '';
  return { ...DEFAULT_PARTNER_COMPANY, email, representative: name };
};

export const savePartnerCompanyProfile = (payload) => {
  localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(payload));
  return Promise.resolve({ success: true, company: payload });
};

export const mapPartnerToCompanyForm = (partner) => {
  const stored = loadPartnerCompanyProfile();
  if (!partner) return stored;
  return {
    companyName: partner.name || '',
    taxId: partner.partnerCode || '',
    representative: partner.representative || '',
    email: partner.email || stored.email || '',
    phone: partner.phone || '',
    address: partner.address || '',
    logo: partner.logo || stored.logo || '',
    status: partner.status,
    rejectionReason: partner.rejectionReason || '',
    supplementReason: partner.supplementReason || ''
  };
};

export const mapCompanyFormToPartnerPatch = (form) => {
  const payload = {
    name: form.companyName?.trim() || '',
    partnerCode: form.taxId?.trim() || '',
    representative: form.representative?.trim() || '',
    phone: form.phone?.trim() || '',
    address: form.address?.trim() || ''
  };
  if (form.logo !== undefined) {
    payload.logo = form.logo || '';
  }
  return payload;
};

export const loadPartnerNotificationPrefs = () => {
  try {
    const raw = localStorage.getItem(NOTIFY_STORAGE_KEY);
    if (raw) return { ...DEFAULT_PARTNER_NOTIFICATIONS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PARTNER_NOTIFICATIONS };
};

export const savePartnerNotificationPrefs = (prefs) => {
  localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(prefs));
  return Promise.resolve({ success: true, prefs });
};

export const changePartnerPassword = (currentPassword, newPassword) =>
  fetch(`${API_BASE}/api/user/change-password`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  }).then(parseJson);
