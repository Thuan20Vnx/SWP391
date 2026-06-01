import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import fptLogo from '../assets/fpt_logo.png';
import defaultAvatar from '../constants/defaultAvatar';
import ProfileSidebarMenu from './ProfileSidebarMenu';
import AdminDrawerMenu from './admin/AdminDrawerMenu';
import NotificationBell from './NotificationBell';
import { getRoleLabel } from '../utils/role';
import useUserProfile, { clearUserProfileCache } from '../hooks/useUserProfile';
import { dispatchAuthChanged } from '../utils/authEvents';
import { getUserRole, isAdminRole, normalizeRole, isClubManagerRole, clearSession } from '../utils/auth';
import { useCloseOnClickOutside } from '../hooks/useCloseOnClickOutside';
import '../styles/admin-menu.css';

const BASE_NAV_ITEMS = [
  { key: 'home', label: 'Trang chủ', to: '/' },
  { key: 'events', label: 'Sự kiện', to: '/events' },
  { key: 'clubs', label: 'Câu lạc bộ', to: '/clubs' },
  { key: 'news', label: 'Tin tức', to: '/announcements' },
];

const ADMIN_NAV_ITEM = {
  key: 'admin',
  label: 'Quản trị viên',
  to: '/admin',
};

const CLUB_MANAGER_NAV_ITEM = {
  key: 'club-manage',
  label: 'Quản lý CLB',
  to: '/quan-ly-clb',
};

const SiteHeader = ({
  activeNav = 'home',
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
  onSearchKeyDown,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const { isLoggedIn, userProfile, profileLoading } = useUserProfile();

  const role = normalizeRole(userProfile.role || getUserRole());
  const showAdminMenu = isLoggedIn && isAdminRole(role);
  const showClubManagerNav = isLoggedIn && isClubManagerRole(role);
  const isAdminRoute = pathname.startsWith('/admin');
  const resolvedSearchPlaceholder =
    searchPlaceholder
    ?? (isAdminRoute && showAdminMenu
      ? 'Tìm kiếm tài khoản, mã lệnh, log hệ thống...'
      : 'Tìm kiếm sự kiện...');

  const navItems = showAdminMenu
    ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
    : showClubManagerNav
      ? [...BASE_NAV_ITEMS, CLUB_MANAGER_NAV_ITEM]
      : BASE_NAV_ITEMS;

  useEffect(() => {
    setAdminDrawerOpen(false);
    setProfilePopupOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profilePopupOpen) return undefined;

    const handleEscape = (e) => {
      if (e.key === 'Escape') setProfilePopupOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [profilePopupOpen]);

  useCloseOnClickOutside(profileRef, profilePopupOpen, () => setProfilePopupOpen(false));

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
      profile: '/profile',
      'browse-events': '/events',
      settings: '/settings',
      schedule: '/schedule',
      'my-clubs': isClubManagerRole() ? '/quan-ly-clb' : '/my-clubs',
      'club-manage': '/quan-ly-clb',
      'my-events': '/my-events',
    };

    if (routes[action]) {
      navigate(routes[action]);
    }
  };

  const handleLogout = () => {
    clearSession();
    clearUserProfileCache();
    dispatchAuthChanged();
    setProfilePopupOpen(false);
    navigate('/');
  };

  return (
    <>
    <header className={`home-header site-header${showAdminMenu ? ' site-header--admin' : ''}`}>
      <div className="header-container site-header__container">
        {showAdminMenu ? (
          <button
            type="button"
            className="admin-hamburger-btn"
            onClick={() => setAdminDrawerOpen((v) => !v)}
            aria-label="Mở menu quản trị"
            aria-expanded={adminDrawerOpen}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Mở menu"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
            </svg>
          </button>
        )}

        <div className="header-logo site-header__logo-group">
          <img
            src={fptLogo}
            alt="F Events Logo"
            className="logo-img"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          />
          <nav className={`header-nav site-header__nav ${mobileMenuOpen ? 'mobile-active' : ''}`}>
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={`nav-link ${activeNav === item.key ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="header-search-box site-header__search">
          <span className="search-icon-inside">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
            </svg>
          </span>
          <input
            type="text"
            placeholder={resolvedSearchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="search-input site-header__search-input"
          />
        </div>

        <div className="header-actions">
          <NotificationBell
            open={notifOpen}
            onOpenChange={(open) => {
              setNotifOpen(open);
              if (open) setProfilePopupOpen(false);
            }}
            isAdmin={isAdminRoute && showAdminMenu}
            isClub={showClubManagerNav && !isAdminRoute}
          />

          <div className="auth-profile-wrapper">
            {isLoggedIn ? (
              profileLoading && !userProfile.fullname ? (
                <div className="profile-display-card profile-display-card--loading" aria-busy="true" aria-label="Đang tải thông tin tài khoản">
                  <div className="profile-info-text">
                    <span className="profile-skeleton profile-skeleton--name" />
                    <span className="profile-skeleton profile-skeleton--line" />
                  </div>
                  <div className="profile-avatar-circle profile-skeleton profile-skeleton--avatar" />
                </div>
              ) : (
                <div className="profile-display-card" ref={profileRef}>
                  <button
                    type="button"
                    className={`profile-display-card-link ${profilePopupOpen ? 'profile-display-card-link--open' : ''}`}
                    title="Mở menu tài khoản"
                    onClick={handleOpenProfilePopup}
                    aria-expanded={profilePopupOpen}
                  >
                    <div className="profile-info-text">
                      <span className="profile-name">{userProfile.fullname || 'Người dùng'}</span>
                      <span
                        className={`profile-role${
                          isAdminRole(role) ? ' profile-role-admin' : ''
                        }`}
                      >
                        {isAdminRole(role)
                          ? getRoleLabel(userProfile.role, userProfile.course)
                          : (
                            <>
                              {getRoleLabel(userProfile.role)}
                              {userProfile.course ? ` · ${userProfile.course}` : ''}
                            </>
                          )}
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
                      <div
                        className="profile-menu-dropdown"
                        role="menu"
                        aria-label="Menu tài khoản"
                      >
                        <ProfileSidebarMenu
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
              <div className="auth-buttons">
                <Link to="/login" className="btn-auth btn-auth-login">Đăng nhập</Link>
                <Link to="/signup" className="btn-auth btn-auth-signup">Đăng ký</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {showAdminMenu && (
      <AdminDrawerMenu
        open={adminDrawerOpen}
        onClose={() => setAdminDrawerOpen(false)}
      />
    )}
    </>
  );
};

export default SiteHeader;
