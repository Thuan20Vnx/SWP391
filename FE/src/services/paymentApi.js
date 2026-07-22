import { API_BASE, getAuthHeaders } from '../utils/api';

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Yêu cầu thất bại');
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
};

// Create an event ticket payment order.
export const checkoutEventTicket = (eventId) =>
  fetch(`${API_BASE}/api/payments/events/${eventId}/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(),
  }).then(parseJson);

// Poll payment status.
export const fetchPaymentStatus = (code) =>
  fetch(`${API_BASE}/api/payments/${encodeURIComponent(code)}/status`, {
    headers: getAuthHeaders(),
  }).then(parseJson);

// Cancel a pending payment order.
export const cancelPayment = (code) =>
  fetch(`${API_BASE}/api/payments/${encodeURIComponent(code)}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  }).then(parseJson);
