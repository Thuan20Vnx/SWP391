import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import defaultAvatar from '../../constants/defaultAvatar';
import AdminProfileMenu from './AdminProfileMenu';
import HeaderNotificationPanel from '../HeaderNotificationPanel';
import useUserProfile, { clearUserProfileCache } from '../../hooks/useUserProfile';
import { dispatchAuthChanged } from '../../utils/authEvents';
import { getRoleLabel } from '../../utils/role';
import { useTranslation } from '../../i18n/I18nContext';
import { ADMIN_PUBLIC_NAV_ITEMS, isAdminPublicNavActive } from '../../data/adminPublicNav';
import '../../styles/admin-menu.css';

const NAV_ITEMS = ADMIN_PUBLIC_NAV_ITEMS;

const isNavActive = isAdminPublicNavActive;

const AdminTopHeader = ({
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
  onSearchKeyDown,
  sidebarToggle,
  sidebarOpen = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const profileTriggerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const searchInputRef = useRef(null);
  const { isLoggedIn, userProfile, profileLoading } = useUserProfile();

  const activeNavItem = NAV_ITEMS.find((item) => isNavActive(item.key, pathname)) ?? NAV_ITEMS[0];
  const showMobileSearch = typeof onSearchChange === 'function';
  const searchToggleLabel = mobileSearchOpen ? t('header.closeSearch') : t('header.openSearch');

  const closeMobileOverlays = () => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  };

  useEffect(() => {
    setNotifOpen(false);
    setProfilePopupOpen(false);
    closeMobileOverlays();
  }, [pathname]);

  useEffect(() => {
    if (!profilePopupOpen) return undefined;
    const handleEscape = (e) => {
      if (e.key === 'Escape') setProfilePopupOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [profilePopupOpen]);

  useEffect(() => {
    if (!profilePopupOpen) return undefined;

    const handlePointerDown = (event) => {
      if (profileTriggerRef.current?.contains(event.target)) return;
      if (profileMenuRef.current?.contains(event.target)) return;
      setProfilePopupOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [profilePopupOpen]);

  useEffect(() => {
    if (mobileSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    closeMobileOverlays();
    setProfilePopupOpen(false);
    setNotifOpen(false);
  }, [sidebarOpen]);

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
      settings: '/admin/settings',
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

  const handleLogoClick = () => navigate('/');

  return (
    <>
    <header
      className={`home-header site-header site-header--admin site-header--with-shell admin-home-header${
        sidebarOpen ? ' admin-home-header--sidebar-open site-header--sidebar-open' : ''
      }${mobileSearchOpen ? ' site-header--mobile-search-open' : ''}`}
    >
      <div className="header-container site-header__container admin-header-container">
        <div className="ctsv-header-start site-header__start">
          <div className="ctsv-header-brand">
            <button
              type="button"
              className="admin-hamburger-btn admin-header-menu-btn"
              onClick={sidebarToggle}
              aria-label={sidebarOpen ? t('header.hideAdminMenu') : t('header.showAdminMenu')}
              aria-expanded={sidebarOpen}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
              </svg>
            </button>
            <div
              className={`header-logo ctsv-header-logo site-header__logo${sidebarOpen ? ' is-collapsed' : ''}`}
              onClick={handleLogoClick}
              role="presentation"
            >
              <img src={FE_LOGO} alt={FE_LOGO_ALT} className="logo-img admin-header-logo-img" />
            </div>
          </div>
          <nav
            className={`header-nav site-header__nav ctsv-header-nav${mobileMenuOpen ? ' mobile-active' : ''}`}
            aria-label={t('header.navigation')}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={`nav-link ${isNavActive(item.key, pathname) ? 'active' : ''}`}
                onClick={closeMobileOverlays}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </div>

        <button
          type="button"
          className="site-header__nav-toggle"
          onClick={() => {
            setMobileSearchOpen(false);
            setMobileMenuOpen((open) => !open);
          }}
          aria-label={mobileMenuOpen ? t('header.closeMenu') : t('header.openMenu')}
          aria-expanded={mobileMenuOpen}
        >
          <span className="site-header__nav-toggle-label">
            {t(activeNavItem?.shortLabelKey || activeNavItem?.labelKey)}
          </span>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            {mobileMenuOpen ? (
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z" fill="currentColor" />
            ) : (
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor" />
            )}
          </svg>
        </button>

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
            placeholder={searchPlaceholder ?? t('header.searchAdmin')}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="search-input site-header__search-input"
            aria-label={t('header.search')}
          />
        </div>

        <div className="header-actions">
          {showMobileSearch && (
            <button
              type="button"
              className="site-header__mobile-search-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                setMobileSearchOpen((open) => !open);
              }}
              aria-label={searchToggleLabel}
              aria-expanded={mobileSearchOpen}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
              </svg>
            </button>
          )}

          <div className="header-notif-wrap">
            <button
              type="button"
              className={`notif-bell-btn${notifOpen ? ' notif-bell-btn--open' : ''}`}
              aria-label={t('header.notifications')}
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
                  aria-label={t('header.loadingProfile')}
                >
                  <div className="profile-info-text">
                    <span className="profile-skeleton profile-skeleton--name" />
                    <span className="profile-skeleton profile-skeleton--line" />
                  </div>
                  <div className="profile-avatar-circle profile-skeleton profile-skeleton--avatar" />
                </div>
              ) : (
                <div className="profile-display-card" ref={profileTriggerRef}>
                  <button
                    type="button"
                    className={`profile-display-card-link ${profilePopupOpen ? 'profile-display-card-link--open' : ''}`}
                    title={t('header.openAccountMenu')}
                    onClick={handleOpenProfilePopup}
                    aria-expanded={profilePopupOpen}
                  >
                    <div className="profile-info-text">
                      <span className="profile-name">{userProfile.fullname || t('header.defaultAdmin')}</span>
                      <span className="profile-role profile-role-admin">
                        {getRoleLabel(userProfile.role)}
                      </span>
                    </div>
                    <div className="profile-avatar-circle">
                      <img src={userProfile.picture || defaultAvatar} alt="" />
                    </div>
                  </button>
                  {profilePopupOpen && createPortal(
                    <>
                      <div
                        className="profile-menu-backdrop"
                        onClick={() => setProfilePopupOpen(false)}
                        role="presentation"
                        aria-hidden="true"
                      />
                      <div
                        ref={profileMenuRef}
                        className="profile-menu-dropdown"
                        role="menu"
                        aria-label={t('header.accountMenu')}
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        <AdminProfileMenu
                          activeItem=""
                          userProfile={userProfile}
                          onMenuAction={handleProfileMenuAction}
                          onLogout={handleLogout}
                        />
                      </div>
                    </>,
                    document.body,
                  )}
                </div>
              )
            ) : (
              <Link to="/login" className="btn-auth btn-auth-login">
                {t('header.login')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {mobileSearchOpen && showMobileSearch && (
        <div className="site-header__mobile-search-panel">
          <span className="search-icon-inside">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
            </svg>
          </span>
          <input
            ref={searchInputRef}
            type="search"
            name="admin-header-mobile-search"
            placeholder={searchPlaceholder ?? t('header.searchAdmin')}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="search-input site-header__search-input"
            autoFocus
          />
        </div>
      )}
    </header>

    {(mobileMenuOpen || mobileSearchOpen) && (
      <button
        type="button"
        className="site-header__mobile-backdrop"
        aria-label={t('header.closeMenu')}
        onClick={closeMobileOverlays}
      />
    )}
    </>
  );
};

export default AdminTopHeader;
