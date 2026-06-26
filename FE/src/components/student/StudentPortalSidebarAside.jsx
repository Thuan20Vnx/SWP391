import React from 'react';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../../constants/defaultAvatar';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { resolveUserAvatar } from '../../utils/image';
import { getRoleLabel, isAdminRoleLabel } from '../../utils/role';
import { clearUserProfileCache } from '../../hooks/useUserProfile';
import { dispatchAuthChanged } from '../../utils/authEvents';
import DashboardSidebarNav from '../DashboardSidebarNav';

const StudentPortalSidebarAside = ({
  sidebarActive = false,
  activeMenu = '',
  userProfile = null,
  profileLoading = false,
  onCloseSidebar,
  onProfileMenuItem,
}) => {
  const navigate = useNavigate();

  const displayAvatar = resolveUserAvatar(userProfile, defaultAvatar);
  const fullname = userProfile?.fullname || localStorage.getItem('userFullname') || 'Người dùng';
  const role = userProfile?.role || localStorage.getItem('userRole') || 'student';
  const course = userProfile?.course || '';

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    clearUserProfileCache();
    dispatchAuthChanged();
    navigate('/login');
  };

  const handleScanClick = () => {
    navigate('/quet-qr');
    onCloseSidebar?.();
  };

  return (
    <aside className={`sidebar-aside ${sidebarActive ? 'active' : ''}`} aria-label="Menu sinh viên">
      <div
        className="sidebar-logo"
        onClick={() => navigate('/')}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
        role="button"
        tabIndex={0}
      >
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="logo-icon" />
      </div>

      <DashboardSidebarNav
        activeMenu={activeMenu}
        onScanClick={handleScanClick}
        onCloseSidebar={onCloseSidebar}
        onProfileMenuItem={onProfileMenuItem}
      />

      <div className="sidebar-footer">
        <button type="button" className="sidebar-user-card" onClick={() => navigate('/profile')}>
          {profileLoading ? (
            <div className="sidebar-avatar profile-skeleton profile-skeleton--avatar" aria-hidden="true" />
          ) : (
            <img className="sidebar-avatar" src={displayAvatar} alt="" />
          )}
          <div className="sidebar-user-info">
            {profileLoading ? (
              <span className="profile-skeleton profile-skeleton--name" />
            ) : (
              <>
                <span className="sidebar-user-name">{fullname}</span>
                {role?.toLowerCase() !== 'student' && (
                  <span
                    className={`sidebar-user-role${
                      isAdminRoleLabel(role) ? ' profile-role-admin' : ''
                    }`}
                  >
                    {getRoleLabel(role, isAdminRoleLabel(role) ? course : undefined)}
                  </span>
                )}
              </>
            )}
          </div>
        </button>

        <button type="button" className="btn-logout" onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default StudentPortalSidebarAside;
