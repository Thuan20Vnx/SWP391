import { API_BASE } from './api';
import { clearSession } from './auth';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '961679973354-7lbmf87ehfimgritjda29mdfb0e8d3rs.apps.googleusercontent.com';

// Google yêu cầu redirect_uri là URL tuyệt đối và phải khớp URI đã đăng ký trong
// Google Cloud Console. Trên localhost dev, API_BASE = '' (đi qua Vite proxy) nên
// không dùng được. Ta suy ra origin backend theo ĐÚNG host đang truy cập của trình
// duyệt (localhost hay IP LAN), cổng 5000, để cả desktop lẫn điện thoại đều chạy được
// mà không phụ thuộc biến môi trường cố định.
const resolveBackendOrigin = () => {
  // Production: BE ở host riêng (vd Render) → dùng VITE_API_BASE. Bắt buộc ưu tiên,
  // nếu không sẽ ghép nhầm thành <host-FE>:5000 gây redirect_uri_mismatch.
  const envBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
  if (envBase) return envBase;
  // Dev local/LAN: BE chạy cùng máy, cổng 5000 (theo đúng host trình duyệt đang mở).
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return (API_BASE || 'http://localhost:5000').replace(/\/$/, '');
};

export const GOOGLE_REDIRECT_URI = `${resolveBackendOrigin()}/api/auth/google/callback`;

const buildGoogleAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${resolveBackendOrigin()}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    // Gửi kèm origin FE để backend biết chuyển hướng về đúng nơi đã bắt đầu đăng nhập.
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

const currentOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '');

export const startGoogleLogin = () => {
  clearSession();
  window.location.href = buildGoogleAuthUrl(currentOrigin());
};

/**
 * Liên kết tài khoản Google vào tài khoản ĐANG đăng nhập.
 *
 * Khác startGoogleLogin ở hai điểm: không xóa phiên hiện tại, và gửi kèm email của
 * tài khoản để backend từ chối nếu người dùng lỡ chọn nhầm Google account khác —
 * không có chốt đó thì luồng này sẽ âm thầm đăng nhập sang tài khoản kia.
 */
export const startGoogleLink = (currentEmail, returnTo) => {
  if (typeof window !== 'undefined' && returnTo) {
    // Trang callback dùng cái này để đưa người dùng về đúng chỗ đã bấm nút.
    sessionStorage.setItem('googleLinkReturnTo', returnTo);
  }
  const state = `${currentOrigin()}|link:${encodeURIComponent(currentEmail || '')}`;
  window.location.href = buildGoogleAuthUrl(state);
};
