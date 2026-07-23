import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

const parseJson = async (res) => {
  const { data } = await parseApiResponse(res);
  return data;
};

export async function fetchStationQr(eventId) {
  const res = await fetch(`${API_BASE}/api/events/${eventId}/station-qr`, { headers: getAuthHeaders() });
  return parseJson(res);
}

export async function generateStationQr(eventId, body) {
  const res = await fetch(`${API_BASE}/api/events/${eventId}/station-qr`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function selfScanEvent(eventId, body) {
  const res = await fetch(`${API_BASE}/api/events/${eventId}/self-scan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function selfScanByAttendanceCode(body) {
  const res = await fetch(`${API_BASE}/api/events/attendance-code/scan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
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

/* ── IC-PDP duyệt yêu cầu chuyển nhượng chủ nhiệm ── */
export async function fetchClubTransferRequests(status = 'all') {
  const res = await fetch(`${API_BASE}/api/clubs/transfer-requests?status=${encodeURIComponent(status)}`, {
    headers: getAuthHeaders(false),
  });
  return parseJson(res);
}

export async function approveClubTransferRequest(id) {
  const res = await fetch(`${API_BASE}/api/clubs/transfer-requests/${id}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return parseJson(res);
}

export async function rejectClubTransferRequest(id, reason) {
  const res = await fetch(`${API_BASE}/api/clubs/transfer-requests/${id}/reject`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return parseJson(res);
}
