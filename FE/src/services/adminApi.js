import { API_BASE, getAuthHeaders } from '../utils/api';

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Yêu cầu thất bại!');
  }
  return data;
};

export const fetchAdminAccounts = async ({ page = 1, limit = 10, role = 'all', search = '' }) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    role,
    search,
  });
  const res = await fetch(`${API_BASE}/api/admin/accounts?${params}`, {
    headers: getAuthHeaders(false),
  });
  return parseJson(res);
};

export const createAdminAccount = async (payload) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

export const updateAdminAccountStatus = async (id, isActive) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ isActive }),
  });
  return parseJson(res);
};

export const fetchAdminAccount = async (id) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${id}`, {
    headers: getAuthHeaders(false),
  });
  return parseJson(res);
};

export const updateAdminAccount = async (id, payload) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

export const fetchAdminDataOverview = async () => {
  const res = await fetch(`${API_BASE}/api/admin/data/overview`, {
    headers: getAuthHeaders(false),
  });
  return parseJson(res);
};

export const deleteAdminAccount = async (id) => {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  });
  return parseJson(res);
};

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
