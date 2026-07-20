/** Đổi email đăng nhập / tên đăng nhập của chính người dùng. */

import { API_BASE, getAuthHeaders } from '../utils/api';

const post = async (path, body) => {
  const res = await fetch(`${API_BASE}/api/user/${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Thao tác thất bại.');
    err.status = res.status;
    err.code = data.code;
    err.remainingAttempts = data.remainingAttempts;
    throw err;
  }
  return data;
};

export const requestEmailChange = (newEmail, currentPassword) =>
  post('email-change/request', { newEmail, currentPassword });

export const confirmEmailChange = (otpCurrent, otpNew) =>
  post('email-change/confirm', { otpCurrent, otpNew });

export const requestUsernameChange = (newUsername, currentPassword) =>
  post('username-change/request', { newUsername, currentPassword });

export const confirmUsernameChange = (otp) =>
  post('username-change/confirm', { otp });
