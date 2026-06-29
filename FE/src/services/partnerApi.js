import { API_BASE, getAuthHeaders } from '../utils/api';
import { buildCoreEventPayload } from '../utils/eventFormState';

const COMPANY_STORAGE_KEY = 'fevents_partner_company';
const NOTIFY_STORAGE_KEY = 'fevents_partner_notifications';

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

export const checkPartnerVenueConflicts = (body) =>
  partnerFetch('/proposals/check-venue-conflicts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
