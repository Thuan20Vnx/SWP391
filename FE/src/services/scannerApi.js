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

export async function transferClubChairman(body) {
  const res = await fetch(`${API_BASE}/api/clubs/manage/transfer-chairman`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return parseJson(res);
}
