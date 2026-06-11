import { clearSession } from './auth';
import { clearUserProfileCache } from '../hooks/useUserProfile';
import { dispatchAuthChanged } from './authEvents';

export const LOGOUT_CONFIRM_MESSAGE =
  'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?';

export const confirmLogout = () => window.confirm(LOGOUT_CONFIRM_MESSAGE);

let sessionExpiryHandled = false;

export const expireSessionOnce = (
  navigate,
  { showToast, toastMessage = 'Phiên đăng nhập hết hạn — vui lòng đăng nhập lại.' } = {}
) => {
  if (sessionExpiryHandled) return false;
  sessionExpiryHandled = true;
  clearSession();
  clearUserProfileCache();
  dispatchAuthChanged();
  showToast?.(toastMessage, 'error');
  navigate('/login', { replace: true });
  return true;
};

/**
 * Clears session and redirects to login after user confirms.
 * @returns {boolean} true if logout was performed
 */
export const logoutWithConfirm = (
  navigate,
  { showToast, toastMessage = 'Đã đăng xuất.' } = {}
) => {
  if (!confirmLogout()) return false;
  clearSession();
  clearUserProfileCache();
  dispatchAuthChanged();
  showToast?.(toastMessage, 'info');
  navigate('/login');
  return true;
};
