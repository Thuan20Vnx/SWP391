import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import fptLogo from '../assets/fpt_logo.png';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { resolveUserAvatar } from '../utils/image';
import { getRoleLabel, isAdminRoleLabel } from '../utils/role';
import { cacheUserProfile, clearUserProfileCache, readUserProfileSummaryCache } from '../hooks/useUserProfile';
import { mapUserToProfileDetail, writeProfileDetailCache } from '../utils/profileDetailCache';
import { dispatchAuthChanged } from '../utils/authEvents';
import DashboardSidebarNav from './DashboardSidebarNav';

const StudentDashboardLayout = ({
  activeMenu,
  pageTitle,
  pageSubtitle,
  breadcrumbLabel,
  children,
  showToast,
}) => {
  const navigate = useNavigate();
  const bootstrapSummary = readUserProfileSummaryCache();
  const [sidebarActive, setSidebarActive] = useState(false);
  const [profileLoading, setProfileLoading] = useState(() => !bootstrapSummary);
  const [profileData, setProfileData] = useState(() => ({
    fullname: bootstrapSummary?.fullname || localStorage.getItem('userFullname') || '',
    picture: bootstrapSummary?.picture || '',
    role: bootstrapSummary?.role || localStorage.getItem('userRole') || 'guest',
    course: bootstrapSummary?.course || '',
  }));

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setProfileLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    if (!bootstrapSummary) setProfileLoading(true);

    fetch(`${API_BASE}/api/user/profile`, {
      headers: getAuthHeaders(false),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const user = data.user || {};
        const nextProfile = {
          fullname: user.fullname || '',
          picture: resolveUserAvatar(user, ''),
          role: user.role || localStorage.getItem('userRole') || 'guest',
          course: user.course || '',
        };
        setProfileData(nextProfile);
        cacheUserProfile(nextProfile);
        const detail = mapUserToProfileDetail(user);
        if (detail) writeProfileDetailCache(detail);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!sidebarActive) {
      document.body.style.overflow = '';
      return undefined;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarActive]);

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
  };

  const displayAvatar = profileData.picture || defaultAvatar;
  const currentCrumb = breadcrumbLabel || pageTitle;

  return (
    <div className="profile-page student-portal">
      {sidebarActive && (
        <div
          className="sidebar-overlay active"
          onClick={() => setSidebarActive(false)}
          aria-hidden="true"
        />
      )}

      <div className="dashboard-container">
        <aside className={`sidebar-aside ${sidebarActive ? 'active' : ''}`}>
          <div className="sidebar-logo" onClick={() => navigate('/')}>
            <img src={fptLogo} alt="F Events Logo" />
          </div>

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
                  <span className="sidebar-user-name">{profileData.fullname || 'Người dùng'}</span>
                  {profileData.role?.toLowerCase() !== 'student' && (
                    <span
                      className={`sidebar-user-role${
                        isAdminRoleLabel(profileData.role) ? ' profile-role-admin' : ''
                      }`}
                    >
                      {getRoleLabel(
                        profileData.role,
                        isAdminRoleLabel(profileData.role) ? profileData.course : undefined
                      )}
                    </span>
                  )}
                </>
              )}
            </div>
          </button>

          <DashboardSidebarNav
            activeMenu={activeMenu}
            onScanClick={handleScanClick}
            onCloseSidebar={() => setSidebarActive(false)}
          />

          <div className="sidebar-footer">
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

        <main className="dashboard-main">
          <header className="top-navbar">
            <div className="navbar-left">
              <button
                type="button"
                className="btn-mobile-menu-toggle"
                aria-label="Mở menu"
                onClick={() => setSidebarActive(true)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="breadcrumbs">
                <Link to="/">Trang chủ</Link>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <span className="current">{currentCrumb}</span>
              </div>
              {pageTitle && (
                <h2 className="student-mobile-nav-title">{pageTitle}</h2>
              )}
            </div>

            <div className="navbar-right">
              <button type="button" className="navbar-user-menu" onClick={() => navigate('/profile')}>
                {profileLoading ? (
                  <div className="navbar-user-avatar profile-skeleton profile-skeleton--avatar" aria-hidden="true" />
                ) : (
                  <img className="navbar-user-avatar" src={displayAvatar} alt="" />
                )}
                <div className="navbar-user-details">
                  {profileLoading ? (
                    <span className="profile-skeleton profile-skeleton--name" />
                  ) : (
                    <>
                      <span className="navbar-user-name">{profileData.fullname || 'Người dùng'}</span>
                      {profileData.role?.toLowerCase() !== 'student' && (
                        <span
                          className={`navbar-user-role${
                            isAdminRoleLabel(profileData.role) ? ' profile-role-admin' : ''
                          }`}
                        >
                          {getRoleLabel(
                            profileData.role,
                            isAdminRoleLabel(profileData.role) ? profileData.course : undefined
                          )}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </button>
            </div>
          </header>

          <div className="dashboard-content-wrapper">
            {(pageTitle || pageSubtitle) && (
              <div className="page-header">
                {pageTitle && <h1>{pageTitle}</h1>}
                {pageSubtitle && <p>{pageSubtitle}</p>}
              </div>
            )}
            {children}
          </div>

          <footer className="dashboard-footer">
            <p>© 2026 FPT Event Platform. All rights reserved.</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboardLayout;
