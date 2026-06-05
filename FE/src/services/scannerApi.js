import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

const parseJson = async (res) => {
  const { data } = await parseApiResponse(res);
  return data;
};

export async function fetchScannerGrants(eventId) {
  const res = await fetch(`${API_BASE}/api/events/${eventId}/scanner-grants`, { headers: getAuthHeaders() });
  return parseJson(res);
}

export async function createScannerGrant(eventId, body) {
  const res = await fetch(`${API_BASE}/api/events/${eventId}/scanner-grants`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function revokeScannerGrant(eventId, grantId) {
  const res = await fetch(`${API_BASE}/api/events/${eventId}/scanner-grants/${grantId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseJson(res);
}

export async function scanEventRegistration(eventId, body) {
  const res = await fetch(`${API_BASE}/api/events/${eventId}/scan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function fetchMyScannerEvents() {
  const res = await fetch(`${API_BASE}/api/events/scanner/my-events`, { headers: getAuthHeaders() });
  return parseJson(res);
}

export async function transferClubChairman(body) {
  const res = await fetch(`${API_BASE}/api/clubs/manage/transfer-chairman`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return parseJson(res);
}
