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

export const fetchAdminCalendar = () => adminFetch('/events/calendar');

export const fetchAdminSubmittedCtsvReports = () => adminFetch('/ctsv-report-submissions');

export const fetchAdminSubmittedCtsvReportDetail = (reportId) =>
  adminFetch(`/ctsv-report-submissions/${encodeURIComponent(reportId)}`);

export const fetchAdminPartners = (status = 'pending_admin') =>
  adminFetch(`/partners?status=${encodeURIComponent(status)}`);

export const fetchAdminPartner = (id) =>
  adminFetch(`/partners/${encodeURIComponent(String(id).replace(/^partner-/, ''))}`);

export const requestAdminPartnerTermination = (id, reason) =>
  adminFetch(`/partners/${encodeURIComponent(String(id).replace(/^partner-/, ''))}/request-termination`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });

export const sendAdminPartnerNotice = (id, body) =>
  adminFetch(`/partners/${encodeURIComponent(String(id).replace(/^partner-/, ''))}/send-notice`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const createAdminPartner = (body) =>
  adminFetch('/partners', { method: 'POST', body: JSON.stringify(body) });

export const updateAdminPartner = (id, body) =>
  adminFetch(`/partners/${encodeURIComponent(String(id).replace(/^partner-/, ''))}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteAdminPartner = (id) =>
  adminFetch(`/partners/${encodeURIComponent(String(id).replace(/^partner-/, ''))}`, {
    method: 'DELETE',
  });

export const approveAdminPartner = (id) =>
  adminFetch(`/partners/${id}/approve`, { method: 'PATCH', body: '{}' });

export const rejectAdminPartner = (id, reason = '') =>
  adminFetch(`/partners/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const addAdminPartnerMember = (partnerId, body) =>
  adminFetch(`/partners/${encodeURIComponent(String(partnerId).replace(/^partner-/, ''))}/members`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const removeAdminPartnerMember = (partnerId, memberId) =>
  adminFetch(
    `/partners/${encodeURIComponent(String(partnerId).replace(/^partner-/, ''))}/members/${encodeURIComponent(memberId)}`,
    { method: 'DELETE' },
  );

export const fetchAdminPayments = ({ page = 1, limit = 30, status = '', eventId = '', search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  if (eventId) params.set('eventId', eventId);
  if (search) params.set('search', search);
  return adminFetch(`/payments?${params.toString()}`);
};

export const processAdminRefund = (code, action, note = '') =>
  adminFetch(`/payments/${encodeURIComponent(code)}/refund`, {
    method: 'PATCH',
    body: JSON.stringify({ action, note }),
  });

export const fetchAdminAccounts = async ({ page = 1, limit = 10, role = 'all', search = '' }) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    role,
    search
  });
  const res = await fetch(`${API_BASE}/api/admin/accounts?${params}`, {
    headers: getAuthHeaders(false)
  });
  return parseJson(res);
};

export const createAdminAccount = async (payload) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
};

export const updateAdminAccountStatus = async (id, isActive) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ isActive })
  });
  return parseJson(res);
};

export const lockAdminAccountTemporarily = async (id, days) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${id}/lock`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ days })
  });
  return parseJson(res);
};

export const fetchAdminAccount = async (id) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${id}`, {
    headers: getAuthHeaders(false)
  });
  return parseJson(res);
};

export const updateAdminAccount = async (id, payload) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
};

export const fetchAdminDataOverview = async () => {
  const res = await fetch(`${API_BASE}/api/admin/data/overview`, {
    headers: getAuthHeaders(false)
  });
  return parseJson(res);
};

export const fetchAdminDashboardStats = () => adminFetch('/dashboard/stats');

export const fetchAdminAnalytics = (period = 'month') =>
  adminFetch(`/analytics?period=${encodeURIComponent(period)}`);

export const fetchSystemHealth = () => adminFetch('/system-health');

export const fetchAdminUnitEvents = ({ unitType, unitId, scope = 'unit' } = {}) => {
  const params = new URLSearchParams({ scope });
  if (scope === 'unit' && unitType && unitId) {
    params.set('unitType', unitType);
    params.set('unitId', unitId);
  }
  return adminFetch(`/unit-events?${params}`);
};

export const deleteAdminAccount = async (id) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false)
  });
  return parseJson(res);
};

export const fetchAdminApprovedEvents = ({ source = '', search = '', page = 1, limit = 30 } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (source && source !== 'all') params.set('source', source);
  if (search) params.set('search', search);
  return adminFetch(`/events/approved?${params}`);
};

export const fetchAdminSchoolEvents = (status = 'pending_admin') =>
  adminFetch(`/school-events?status=${encodeURIComponent(status)}`);

export const approveAdminSchoolEvent = (id) =>
  adminFetch(`/school-events/${id}/approve`, { method: 'PATCH', body: '{}' });

export const rejectAdminSchoolEvent = (id, reason = '') =>
  adminFetch(`/school-events/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });

export const fetchAdminModerationRequests = () => adminFetch('/school-events/moderation');

export const approveAdminModeration = (id) =>
  adminFetch(`/school-events/${id}/moderation/approve`, { method: 'PATCH', body: '{}' });

export const rejectAdminModeration = (id, reason = '') =>
  adminFetch(`/school-events/${id}/moderation/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason })
  });

export const fetchAdminEventRequests = async ({ status = 'pending', type = 'all' } = {}) => {
  const params = new URLSearchParams({ status, type });
  const res = await fetch(`${API_BASE}/api/admin/event-requests?${params}`, {
    headers: getAuthHeaders(false),
  });
  return parseJson(res);
};

export const approveAdminEventRequest = async (id, adminNote = '') => {
  const res = await fetch(`${API_BASE}/api/admin/event-requests/${id}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ adminNote }),
  });
  return parseJson(res);
};

export const rejectAdminEventRequest = async (id, adminNote = '') => {
  const res = await fetch(`${API_BASE}/api/admin/event-requests/${id}/reject`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ adminNote }),
  });
  return parseJson(res);
};

export const fetchSystemConfig = () => adminFetch('/system-config');

export const updateSystemMaintenance = (payload) =>
  adminFetch('/system-config', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const updateSystemEmailConfig = (payload) =>
  adminFetch('/system-config/email', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const sendSystemTestEmail = (to) =>
  adminFetch('/system-config/email/test', {
    method: 'POST',
    body: JSON.stringify({ to }),
  });

export const updateSystemSecurityConfig = (payload) =>
  adminFetch('/system-config/security', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const updateSystemPaymentConfig = (payload) =>
  adminFetch('/system-config/payment', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const fetchAuditLogs = (limit = 30) =>
  adminFetch(`/audit-logs?limit=${encodeURIComponent(limit)}`);

export const fetchPublicSystemStatus = async () => {
  const res = await fetch(`${API_BASE}/api/system/status`);
  return parseJson(res);
};

export const fetchClubRegistrationsPendingCount = () =>
  adminFetch('/club-registrations/pending-count');

export const fetchClubRegistrations = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const q = qs.toString();
  return adminFetch(`/club-registrations${q ? `?${q}` : ''}`);
};

export const fetchClubRegistration = (id) => adminFetch(`/club-registrations/${id}`);

export const forwardClubRegistrationToAdmin = (id, note = '') =>
  adminFetch(`/club-registrations/${id}/forward-admin`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const approveClubRegistration = (id, note = '') =>
  adminFetch(`/club-registrations/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const rejectClubRegistration = (id, reason = '') =>
  adminFetch(`/club-registrations/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });

export const requestClubRegistrationRevision = (id, note = '') =>
  adminFetch(`/club-registrations/${id}/revision`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
