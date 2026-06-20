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

// Tạo đơn thanh toán vé sự kiện (mua vé có phí)
export const checkoutEventTicket = (eventId) =>
  fetch(`${API_BASE}/api/payments/events/${eventId}/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(),
  }).then(parseJson);

// Poll trạng thái đơn
export const fetchPaymentStatus = (code) =>
  fetch(`${API_BASE}/api/payments/${encodeURIComponent(code)}/status`, {
    headers: getAuthHeaders(),
  }).then(parseJson);

// Hủy đơn pending
export const cancelPayment = (code) =>
  fetch(`${API_BASE}/api/payments/${encodeURIComponent(code)}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  }).then(parseJson);

// Lịch sử thanh toán của user
export const fetchMyPayments = ({ page = 1, limit = 20 } = {}) =>
  fetch(`${API_BASE}/api/payments/my?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  }).then(parseJson);

// Yêu cầu hoàn tiền
export const requestRefund = (code, reason = '') =>
  fetch(`${API_BASE}/api/payments/${encodeURIComponent(code)}/refund-request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  }).then(parseJson);
