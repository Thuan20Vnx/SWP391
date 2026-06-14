import { clearSession } from './auth';
import { clearUserProfileCache } from '../hooks/useUserProfile';
import { dispatchAuthChanged } from './authEvents';

export const LOGOUT_CONFIRM_MESSAGE =
  'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?';

export const confirmLogout = () => window.confirm(LOGOUT_CONFIRM_MESSAGE);

/**
 * Clears session and redirects to login after user confirms.
 * @returns {boolean} true if logout was performed
 */
export const logoutWithConfirm = (
  navigate,
  { showToast, toastMessage = 'Đã đăng xuất.' } = {}
) => {
  navigate('/login');
  setTimeout(() => {
    clearSession();
    clearUserProfileCache();
    dispatchAuthChanged();
    showToast?.(toastMessage, 'info');
  }, 10);
  return true;
};
