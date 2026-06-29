import { useEffect, useRef } from 'react';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { cacheUserProfile } from '../hooks/useUserProfile';
import { writeProfileDetailCache, mapUserToProfileDetail } from '../utils/profileDetailCache';
import { dispatchAuthChanged } from '../utils/authEvents';
import { getHomePathForRole, normalizeRole, isCtsvRole, USER_ROLES } from '../utils/auth';
import { resetCtsvSidebarOnLogin } from '../components/ctsv/ctsvNavConfig';
import { resetStudentPublicSidebarOnLogin } from '../components/student/studentNavConfig';
import { resolveUserAvatar } from '../utils/image';
import defaultAvatar from '../constants/defaultAvatar';

const persistProfileFromUser = (user) => {
  if (!user) return;
  const profile = {
    fullname: user.fullname || '',
    course: user.course || '',
    picture: resolveUserAvatar(user, defaultAvatar),
    role: user.role || 'guest',
  };
  localStorage.setItem('userRole', profile.role);
  cacheUserProfile(profile);
  const detail = mapUserToProfileDetail(user);
  if (detail) writeProfileDetailCache(detail);
};

const GoogleAuthCallback = ({ showToast }) => {
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth_status');

    const finish = async () => {
      if (authStatus === 'success') {
        const token = params.get('token');
        const email = params.get('email');

        if (!token) {
          showToast?.('Thiếu token đăng nhập Google.', 'error');
          window.location.replace('/login');
          return;
        }

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email || '');
        localStorage.setItem('loginMethod', 'google');
        localStorage.setItem('authToken', token);

        let role = 'student';
        try {
          const res = await fetch(`${API_BASE}/api/user/profile`, {
            headers: getAuthHeaders(false),
          });
          const data = await res.json();
          if (data.success && data.user) {
            persistProfileFromUser(data.user);
            role = normalizeRole(data.user.role);
            if (isCtsvRole(role)) resetCtsvSidebarOnLogin();
            if (role === USER_ROLES.STUDENT || role === USER_ROLES.CLUB_MANAGER) {
              resetStudentPublicSidebarOnLogin();
            }
          }
        } catch {
          // Profile fetch failed — still proceed with token session
        }

        dispatchAuthChanged();
        window.location.replace(getHomePathForRole(role));
        return;
      }

      if (authStatus === 'error') {
        const message = params.get('message') || 'Đăng nhập Google thất bại.';
        showToast?.(message, 'error');
        window.location.replace('/login');
        return;
      }

      window.location.replace('/login');
    };

    finish();
  }, [showToast]);

  return (
    <main className="page-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Đang hoàn tất đăng nhập Google...</p>
    </main>
  );
};

export default GoogleAuthCallback;
