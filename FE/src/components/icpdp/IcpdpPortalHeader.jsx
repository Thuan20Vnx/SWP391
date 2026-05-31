import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import { logoutWithConfirm } from '../../utils/logout';
import CtsvHamburgerButton from '../ctsv/CtsvHamburgerButton';
import IcpdpProfileMenu from './IcpdpProfileMenu';

const NAV_LINKS = [
  { to: '/icpdp', label: 'Trang chủ', match: (path) => path === '/icpdp' },
  {
    to: '/icpdp/proposals',
    label: 'Đề xuất CLB',
    match: (path) => path === '/icpdp/proposals' || path.startsWith('/icpdp/proposals/')
  },
  {
    to: '/icpdp/events',
    label: 'Sự kiện',
    match: (path) => path === '/icpdp/events' || (path.startsWith('/icpdp/events/') && !path.includes('/create'))
  }
];

const ICPDP_MENU_ROUTES = {
  profile: '/icpdp/profile',
  calendar: '/icpdp/calendar',
  settings: '/icpdp/profile'
};

const resolveActiveMenuItem = (pathname) => {
  if (pathname.startsWith('/icpdp/calendar')) return 'calendar';
  if (pathname.startsWith('/icpdp/profile')) return 'profile';
  return '';
};

const IcpdpPortalHeader = ({
  userProfile,
  showToast,
  onToggleSidebar,
  sidebarOpen = false,
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const path = location.pathname;
  const activeMenuItem = useMemo(() => resolveActiveMenuItem(path), [path]);
  const roleLabel = getRoleDisplayLabel(getUserRole());

  useEffect(() => {
    setProfilePopupOpen(false);
  }, [path]);

  const handleLogout = () => {
    setProfilePopupOpen(false);
    logoutWithConfirm(navigate, {
      showToast,
      toastMessage: 'Đã đăng xuất tài khoản IC-PDP.'
    });
  };

  const handleProfileMenuAction = (action) => {
    setProfilePopupOpen(false);
    const route = ICPDP_MENU_ROUTES[action];
    if (route) navigate(route);
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <header
      className={`home-header ctsv-portal-header icpdp-portal-header${showSearch ? ' ctsv-portal-header--with-search' : ''}`}
    >
      <div className="header-container">
        <div className="ctsv-header-start">
          <div className="ctsv-header-brand">
            <CtsvHamburgerButton
              onClick={onToggleSidebar}
              ariaLabel={sidebarOpen ? 'Ẩn menu điều hướng' : 'Mở menu điều hướng'}
            />

            <div
              className={`header-logo ctsv-header-logo${sidebarOpen ? ' is-collapsed' : ''}`}
              onClick={() => navigate('/icpdp')}
              role="presentation"
            >
              <img src={FE_LOGO} alt={FE_LOGO_ALT} className="logo-img" />
            </div>
          </div>

          <nav className={`header-nav ctsv-header-nav ${mobileNavOpen ? 'mobile-active' : ''}`}>
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link ${item.match(path) ? 'active' : ''}`}
                onClick={closeMobileNav}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/icpdp/dashboard"
              className={`nav-link nav-link-ctsv-pill icpdp-pill ${path.startsWith('/icpdp/dashboard') ? 'is-current' : ''}`}
              onClick={closeMobileNav}
            >
              IC-PDP
            </Link>
          </nav>
        </div>

        {showSearch && (
          <div className="header-search-box ctsv-header-search">
            <span className="search-icon-inside" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm đề xuất, sự kiện…"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
              className="search-input"
            />
          </div>
        )}

        <div className="header-actions">
          <button
            type="button"
            className="ctsv-header-nav-toggle"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Menu trang"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path d="M4 8h16v2H4V8zm0 5h16v2H4v-2z" fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            className="notif-bell-btn"
            onClick={() => showToast?.('Có đề xuất CLB mới chờ bạn duyệt nội bộ.', 'info')}
            aria-label="Thông báo"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
                fill="currentColor"
              />
            </svg>
            <span className="notif-badge" />
          </button>

          <div className="auth-profile-wrapper">
            <div className="profile-display-card">
              <button
                type="button"
                className={`profile-display-card-link ${profilePopupOpen ? 'profile-display-card-link--open' : ''}`}
                title="Mở menu tài khoản IC-PDP"
                onClick={() => setProfilePopupOpen((v) => !v)}
                aria-expanded={profilePopupOpen}
                aria-haspopup="menu"
              >
                <div className="profile-info-text">
                  <span className="profile-name">{userProfile.fullname}</span>
                  <span className="profile-role profile-role-ctsv icpdp-role-label">{roleLabel}</span>
                </div>
                <div className="profile-avatar-circle">
                  <img src={userProfile.picture} alt="" />
                </div>
              </button>

              {profilePopupOpen && (
                <>
                  <div
                    className="profile-menu-backdrop"
                    onClick={() => setProfilePopupOpen(false)}
                    role="presentation"
                  />
                  <div className="profile-menu-dropdown" role="menu" aria-label="Menu tài khoản IC-PDP">
                    <IcpdpProfileMenu
                      activeItem={activeMenuItem}
                      userProfile={userProfile}
                      roleLabel={roleLabel}
                      onMenuAction={handleProfileMenuAction}
                      onLogout={handleLogout}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default IcpdpPortalHeader;
