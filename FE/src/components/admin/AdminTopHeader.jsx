import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import defaultAvatar from '../../constants/defaultAvatar';
import AdminProfileMenu from './AdminProfileMenu';
import HeaderNotificationPanel from '../HeaderNotificationPanel';
import useUserProfile, { clearUserProfileCache } from '../../hooks/useUserProfile';
import { dispatchAuthChanged } from '../../utils/authEvents';
import { getRoleLabel } from '../../utils/role';
import { ADMIN_PUBLIC_NAV_ITEMS, isAdminPublicNavActive } from '../../data/adminPublicNav';
import '../../styles/admin-menu.css';

const NAV_ITEMS = ADMIN_PUBLIC_NAV_ITEMS;

const isNavActive = isAdminPublicNavActive;

const AdminTopHeader = ({
  searchPlaceholder = 'Tìm kiếm tài khoản, mã lệnh, log hệ thống...',
  searchValue = '',
  onSearchChange,
  onSearchKeyDown,
  sidebarToggle,
  sidebarOpen = false,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { isLoggedIn, userProfile, profileLoading } = useUserProfile();
  useEffect(() => {
    setNotifOpen(false);
    setProfilePopupOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profilePopupOpen) return undefined;
    const handleEscape = (e) => {
      if (e.key === 'Escape') setProfilePopupOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [profilePopupOpen]);

  const handleToggleNotifications = () => {
    setProfilePopupOpen(false);
    setNotifOpen((prev) => !prev);
  };

  const handleOpenProfilePopup = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setNotifOpen(false);
    setProfilePopupOpen((prev) => !prev);
  };

  const handleProfileMenuAction = (action) => {
    setProfilePopupOpen(false);
    const routes = {
      profile: '/admin/profile',
      calendar: '/admin/calendar',
      partners: '/admin/partners',
      events: '/admin/events',
      settings: '/admin/system',
      'fpt-system': '/',
      'browse-events': '/events',
    };
    if (routes[action]) navigate(routes[action]);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    clearUserProfileCache();
    dispatchAuthChanged();
    setProfilePopupOpen(false);
    navigate('/');
  };

  const homePath = pathname.startsWith('/admin') ? '/admin' : '/';

  return (
    <header
      className={`home-header site-header site-header--admin site-header--with-shell admin-home-header${
        sidebarOpen ? ' admin-home-header--sidebar-open site-header--sidebar-open' : ''
      }`}
    >
      <div className="header-container site-header__container admin-header-container">
        <div className="ctsv-header-start site-header__start">
          <div className="ctsv-header-brand">
            <button
              type="button"
              className="admin-hamburger-btn admin-header-menu-btn"
              onClick={sidebarToggle}
              aria-label={sidebarOpen ? 'Ẩn menu quản trị' : 'Hiện menu quản trị'}
              aria-expanded={sidebarOpen}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
              </svg>
            </button>
            <div
              className={`header-logo ctsv-header-logo site-header__logo${sidebarOpen ? ' is-collapsed' : ''}`}
              onClick={() => navigate(homePath)}
              role="presentation"
            >
              <img src={FE_LOGO} alt={FE_LOGO_ALT} className="logo-img admin-header-logo-img" />
            </div>
          </div>
          <nav className="header-nav site-header__nav ctsv-header-nav" aria-label="Điều hướng">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={`nav-link ${isNavActive(item.key, pathname) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="header-search-box site-header__search">
          <span className="search-icon-inside">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="search-input site-header__search-input"
            aria-label="Tìm kiếm"
          />
        </div>

        <div className="header-actions">
          <div className="header-notif-wrap">
            <button
              type="button"
              className={`notif-bell-btn${notifOpen ? ' notif-bell-btn--open' : ''}`}
              aria-label="Thông báo"
              aria-expanded={notifOpen}
              onClick={handleToggleNotifications}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path
                  d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
                  fill="currentColor"
                />
              </svg>
              <span className="notif-badge" />
            </button>
            <HeaderNotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} isAdmin />
          </div>

          <div className="auth-profile-wrapper">
            {isLoggedIn ? (
              profileLoading && !userProfile.fullname ? (
                <div
                  className="profile-display-card profile-display-card--loading"
                  aria-busy="true"
                  aria-label="Đang tải thông tin tài khoản"
                >
                  <div className="profile-info-text">
                    <span className="profile-skeleton profile-skeleton--name" />
                    <span className="profile-skeleton profile-skeleton--line" />
                  </div>
                  <div className="profile-avatar-circle profile-skeleton profile-skeleton--avatar" />
                </div>
              ) : (
                <div className="profile-display-card">
                  <button
                    type="button"
                    className={`profile-display-card-link ${profilePopupOpen ? 'profile-display-card-link--open' : ''}`}
                    title="Mở menu tài khoản"
                    onClick={handleOpenProfilePopup}
                    aria-expanded={profilePopupOpen}
                  >
                    <div className="profile-info-text">
                      <span className="profile-name">{userProfile.fullname || 'Quản trị viên'}</span>
                      <span className="profile-role profile-role-admin">
                        {getRoleLabel(userProfile.role, userProfile.course)}
                      </span>
                    </div>
                    <div className="profile-avatar-circle">
                      <img src={userProfile.picture || defaultAvatar} alt="" />
                    </div>
                  </button>
                  {profilePopupOpen && (
                    <>
                      <div
                        className="profile-menu-backdrop"
                        onClick={() => setProfilePopupOpen(false)}
                        role="presentation"
                      />
                      <div className="profile-menu-dropdown" role="menu" aria-label="Menu tài khoản">
                        <AdminProfileMenu
                          activeItem=""
                          userProfile={userProfile}
                          onMenuAction={handleProfileMenuAction}
                          onLogout={handleLogout}
                        />
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              <Link to="/login" className="btn-auth btn-auth-login">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopHeader;
