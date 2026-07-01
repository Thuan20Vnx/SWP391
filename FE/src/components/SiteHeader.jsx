import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../assets/brand';
import defaultAvatar from '../constants/defaultAvatar';
import ProfileSidebarMenu from './ProfileSidebarMenu';
import AdminProfileMenu from './admin/AdminProfileMenu';
import CtsvProfileMenu from './ctsv/CtsvProfileMenu';
import AdminDrawerMenu from './admin/AdminDrawerMenu';
import NotificationBell from './NotificationBell';
import ClubSwitchModal from './club/ClubSwitchModal';
import { getRoleLabel } from '../utils/role';
import useUserProfile, { clearUserProfileCache } from '../hooks/useUserProfile';
import { useManagedClubs } from '../hooks/useManagedClubs';
import { dispatchAuthChanged } from '../utils/authEvents';
import {
  getUserRole,
  getRoleDisplayLabel,
  isAdminRole,
  normalizeRole,
  isClubManagerRole,
  clearSession,
  USER_ROLES,
} from '../utils/auth';

const CTSV_PROFILE_MENU_ROUTES = {
  profile: '/ctsv/profile',
  partners: '/ctsv/partners',
  calendar: '/ctsv/calendar',
  'create-event': '/ctsv/events/create',
  settings: '/ctsv/settings',
};
import { navigateClubPortalHome } from './club/clubNavConfig';
import { useCloseOnClickOutside } from '../hooks/useCloseOnClickOutside';
import CtsvHamburgerButton from './ctsv/CtsvHamburgerButton';
import { logoutWithConfirm } from '../utils/logout';
import { ADMIN_PUBLIC_NAV_ITEMS, isAdminPublicNavActive } from '../data/adminPublicNav';
import { PUBLIC_NAV_ITEMS } from '../data/publicNavItems';
import { resolveMobileSearchSuggestions } from '../data/mobileSearchSuggestions';
import '../styles/admin-menu.css';

const BASE_NAV_ITEMS = PUBLIC_NAV_ITEMS.map(({ key, label, path }) => ({
  key,
  label,
  to: path,
}));

const CLUB_MANAGER_NAV_ITEM = {
  key: 'club-manage',
  label: 'Quản lý CLB',
  to: '/quan-ly-clb',
  linkClass: 'nav-link-manager',
};

const CTSV_NAV_ITEM = {
  key: 'ctsv-manage',
  label: 'CTSV',
  to: '/ctsv/dashboard',
  linkClass: 'nav-link-ctsv-pill',
};

const CTSV_BASE_NAV_ITEMS = BASE_NAV_ITEMS.map((item) =>
  item.key === 'clubs'
    ? { key: 'partners', label: 'Đối tác', to: '/ctsv/partners' }
    : item
);

const SiteHeader = ({
  activeNav = 'home',
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
  onSearchKeyDown,
  onTogglePortalSidebar,
  portalSidebarOpen = false,
  adminSidebarOpen = false,
  onAdminSidebarToggle,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchDraft, setMobileSearchDraft] = useState('');
  const wasMobileSearchOpenRef = useRef(false);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [clubSwitchOpen, setClubSwitchOpen] = useState(false);
  const profileRef = useRef(null);
  const searchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const { isLoggedIn, userProfile, profileLoading } = useUserProfile();

  const role = normalizeRole(getUserRole() || userProfile.role);
  const showAdminMenu = isLoggedIn && isAdminRole(role);
  const showClubManagerNav = isLoggedIn && isClubManagerRole(role);
  const showCtsvNav = isLoggedIn && role === USER_ROLES.CTSV && !showAdminMenu;
  const {
    clubs: managedClubs,
    activeClub,
    switchClub,
    loading: managedClubsLoading,
    error: managedClubsError,
    reload: reloadManagedClubs,
  } = useManagedClubs(showClubManagerNav && !showAdminMenu, role);
  const isAdminRoute = pathname.startsWith('/admin');
  const resolvedSearchPlaceholder =
    searchPlaceholder
    ?? (isAdminRoute && showAdminMenu
      ? 'Tìm kiếm tài khoản, mã lệnh, log hệ thống...'
      : 'Tìm kiếm sự kiện...');

  const navItems = showAdminMenu
    ? ADMIN_PUBLIC_NAV_ITEMS
    : showClubManagerNav
      ? [...BASE_NAV_ITEMS, CLUB_MANAGER_NAV_ITEM]
      : showCtsvNav
        ? [...CTSV_BASE_NAV_ITEMS, CTSV_NAV_ITEM]
        : BASE_NAV_ITEMS;

  const isNavItemActive = (item) => {
    if (showAdminMenu) return isAdminPublicNavActive(item.key, pathname);
    if (item.key === 'ctsv-manage') return pathname.startsWith('/ctsv') && !pathname.startsWith('/ctsv/partners');
    if (item.key === 'club-manage') return pathname.startsWith('/quan-ly-clb');
    if (item.key === 'partners') return pathname.startsWith('/ctsv/partners');
    return activeNav === item.key;
  };

  const isAdminPortal = isAdminRoute && showAdminMenu;
  const sidebarControlled =
    showAdminMenu && !isAdminPortal && typeof onAdminSidebarToggle === 'function';
  const menuOpen = sidebarControlled ? adminSidebarOpen : adminDrawerOpen;
  const toggleAdminMenu = sidebarControlled
    ? onAdminSidebarToggle
    : () => setAdminDrawerOpen((v) => !v);

  useEffect(() => {
    if (!sidebarControlled) setAdminDrawerOpen(false);
    setNotifOpen(false);
    setProfilePopupOpen(false);
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [pathname, sidebarControlled]);

  const closeMobileOverlays = () => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  };

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
    setProfilePopupOpen((prev) => {
      const next = !prev;
      if (next && isClubManagerRole()) reloadManagedClubs();
      return next;
    });
  };

  const handleProfileMenuAction = (action) => {
    if (action === 'switch-club') {
      setProfilePopupOpen(false);
      setClubSwitchOpen(true);
      reloadManagedClubs();
      return;
    }

    setProfilePopupOpen(false);

    if (showCtsvNav) {
      const ctsvRoute = CTSV_PROFILE_MENU_ROUTES[action];
      if (ctsvRoute) {
        navigate(ctsvRoute);
        return;
      }
    }

    const routes = isAdminRole(role) || isAdminPortal
      ? {
          profile: '/admin/profile',
          calendar: '/admin/calendar',
          partners: '/admin/partners',
          events: '/admin/events',
          settings: '/admin/settings',
          'fpt-system': '/',
          'browse-events': '/events',
        }
      : {
          profile: '/profile',
          'browse-events': '/events',
          settings: '/settings',
          schedule: '/schedule',
          'my-clubs': isClubManagerRole() ? '/quan-ly-clb' : '/my-clubs',
          'club-manage': '/quan-ly-clb',
          'ctsv-manage': '/ctsv/dashboard',
          scan: '/quet-qr',
          'my-events': '/my-events',
        };

    if (routes[action]) {
      if (action === 'club-manage' || (action === 'my-clubs' && isClubManagerRole())) {
        navigateClubPortalHome(navigate, pathname);
        return;
      }
      navigate(routes[action]);
      return;
    }

    setProfilePopupOpen(false);
  };

  const handleSelectManagedClub = (clubId) => {
    if (!clubId || clubId === activeClub?.id) {
      setClubSwitchOpen(false);
      setProfilePopupOpen(false);
      return;
    }
    switchClub(clubId);
    setClubSwitchOpen(false);
    setProfilePopupOpen(false);
    if (pathname.startsWith('/quan-ly-clb')) {
      window.location.assign('/quan-ly-clb');
    }
  };

  const handleLogout = () => {
    logoutWithConfirm(navigate);
    setProfilePopupOpen(false);
  };

  const hasShellSidebar = Boolean(onTogglePortalSidebar) || (showAdminMenu && !isAdminPortal);
  const portalSidebarActive = Boolean(onTogglePortalSidebar) && portalSidebarOpen;
  const adminMenuOpen = showAdminMenu && !isAdminPortal && menuOpen;
  const sidebarLogoCollapsed = portalSidebarActive || adminMenuOpen;
  const searchCollapsed = false;

  useEffect(() => {
    if (!adminMenuOpen && !portalSidebarActive) setSearchExpanded(false);
  }, [adminMenuOpen, portalSidebarActive]);

  useEffect(() => {
    if (!portalSidebarOpen) return;
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    setProfilePopupOpen(false);
    setNotifOpen(false);
  }, [portalSidebarOpen]);

  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  useEffect(() => {
    if (!mobileSearchOpen) return undefined;

    const focusTimer = window.setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 80);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (e) => {
      if (e.key === 'Escape') setMobileSearchOpen(false);
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (mobileSearchOpen && !wasMobileSearchOpenRef.current) {
      setMobileSearchDraft(searchValue);
    }
    wasMobileSearchOpenRef.current = mobileSearchOpen;
  }, [mobileSearchOpen, searchValue]);

  const hasSearchHandler = typeof onSearchChange === 'function';
  const showMobileSearch = hasSearchHandler;
  const searchToggleLabel = mobileSearchOpen ? 'Đóng tìm kiếm' : 'Mở tìm kiếm';
  const mobileSearchSuggestions = resolveMobileSearchSuggestions(activeNav, pathname, isAdminRoute);
  const trimmedSearchValue = searchValue.trim();
  const trimmedMobileDraft = mobileSearchDraft.trim();
  const hasPendingMobileSearch = trimmedMobileDraft !== trimmedSearchValue;

  const handleMobileSearchSubmit = () => {
    if (!hasPendingMobileSearch) return;
    onSearchChange?.(trimmedMobileDraft);
    setMobileSearchOpen(false);
  };

  const handleMobileSuggestion = (term) => {
    setMobileSearchDraft(term);
    onSearchChange?.(term);
    setMobileSearchOpen(false);
  };

  const handleClearMobileSearch = () => {
    setMobileSearchDraft('');
    mobileSearchInputRef.current?.focus();
  };
  const activeNavItem = navItems.find((item) => isNavItemActive(item)) ?? navItems[0];
  const isPublicEventsRoute = pathname === '/events';
  const isCtsvPortalEventsRoute = pathname === '/ctsv/events';
  const headerRouteClass = [
    isPublicEventsRoute && showCtsvNav ? 'site-header--ctsv-public-events' : '',
    isCtsvPortalEventsRoute ? 'site-header--ctsv-portal-events' : '',
  ].filter(Boolean).join(' ');

  const renderNav = () => (
    <nav
      className={`header-nav site-header__nav${mobileMenuOpen ? ' mobile-active' : ''}`}
      aria-label="Điều hướng chính"
    >
      {navItems.map((item) => (
        <Link
          key={item.key}
          to={item.to}
          className={`nav-link ${item.linkClass || ''} ${isNavItemActive(item) ? 'active' : ''}`.trim()}
          onClick={(e) => {
            closeMobileOverlays();
            if (item.key === 'club-manage') {
              e.preventDefault();
              navigateClubPortalHome(navigate, pathname);
            }
          }}
        >
          {item.label}
        </Link>
      ))}
      {!isLoggedIn && (
        <div className="mobile-nav-auth site-header__mobile-auth">
          <Link
            to="/login"
            className="btn-auth btn-auth-login"
            onClick={() => setMobileMenuOpen(false)}
          >
            Đăng nhập
          </Link>
          <Link
            to="/signup"
            className="btn-auth btn-auth-signup"
            onClick={() => setMobileMenuOpen(false)}
          >
            Đăng ký
          </Link>
        </div>
      )}
    </nav>
  );

  const renderLogo = (collapsed = false) => (
    <div
      className={`header-logo site-header__logo${hasShellSidebar ? ' ctsv-header-logo' : ''}${collapsed ? ' is-collapsed' : ''}`}
      onClick={() => navigate('/')}
      role="presentation"
    >
      <img src={FE_LOGO} alt={FE_LOGO_ALT} className="logo-img" />
    </div>
  );

  return (
    <>
      <header
        className={`home-header site-header${!isLoggedIn ? ' site-header--guest' : ''}${showAdminMenu ? ' site-header--admin' : ''}${hasShellSidebar ? ' site-header--with-shell' : ''}${onTogglePortalSidebar ? ' ctsv-portal-header ctsv-portal-header--with-search' : ''}${sidebarLogoCollapsed ? ' site-header--sidebar-open' : ''}${mobileSearchOpen ? ' site-header--mobile-search-open' : ''}${headerRouteClass ? ` ${headerRouteClass}` : ''}${menuOpen && showAdminMenu && !isAdminPortal ? ' admin-home-header--sidebar-open' : ''}`}
      >
      <div className="header-container site-header__container">
        {hasShellSidebar ? (
          <>
            <div className="ctsv-header-start site-header__start">
              <div className="ctsv-header-brand">
                {onTogglePortalSidebar ? (
                  <CtsvHamburgerButton
                    className="mobile-hamburger-btn"
                    onClick={onTogglePortalSidebar}
                    expanded={portalSidebarOpen}
                    ariaLabel={portalSidebarOpen ? 'Ẩn menu điều hướng' : 'Mở menu điều hướng'}
                  />
                ) : (
                  <CtsvHamburgerButton
                    className="mobile-hamburger-btn"
                    onClick={toggleAdminMenu}
                    expanded={menuOpen}
                    ariaLabel={menuOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'}
                  />
                )}
                {renderLogo(sidebarLogoCollapsed)}
              </div>
              {renderNav()}
            </div>
          </>
        ) : (
          <>
            <div className="ctsv-header-start site-header__start">
              <div className="ctsv-header-brand">
                {!isAdminPortal && (
                  <CtsvHamburgerButton
                    className="mobile-hamburger-btn"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    expanded={mobileMenuOpen}
                    ariaLabel={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
                  />
                )}
                {renderLogo(false)}
              </div>
              {renderNav()}
            </div>
          </>
        )}

        <div className={`header-search-box site-header__search${searchCollapsed ? ' site-header__search--collapsed' : ''}`}>
          {searchCollapsed ? (
            <button
              type="button"
              className="site-header__search-toggle"
              onClick={() => setSearchExpanded(true)}
              aria-label="Mở tìm kiếm"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
              </svg>
            </button>
          ) : (
            <>
              <span className="search-icon-inside">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={resolvedSearchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={onSearchKeyDown}
                onBlur={() => {
                  if ((adminMenuOpen || portalSidebarActive) && !searchValue.trim()) {
                    setSearchExpanded(false);
                  }
                }}
                className="search-input site-header__search-input"
              />
            </>
          )}
        </div>

        <div className="header-actions">
          {hasShellSidebar && (
            <button
              type="button"
              className="site-header__nav-toggle"
              onClick={() => {
                setMobileSearchOpen(false);
                if (activeNavItem?.key === 'club-manage') {
                  navigateClubPortalHome(navigate, pathname);
                  return;
                }
                setMobileMenuOpen((open) => !open);
              }}
              aria-label={mobileMenuOpen ? 'Đóng menu trang' : 'Mở menu trang'}
              aria-expanded={mobileMenuOpen}
            >
              <span className="site-header__nav-toggle-label">{activeNavItem?.label}</span>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path
                    d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"
                    fill="currentColor"
                  />
                ) : (
                  <path
                    d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"
                    fill="currentColor"
                  />
                )}
              </svg>
            </button>
          )}
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
              {mobileSearchOpen ? (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
                </svg>
              )}
            </button>
          )}

          {isLoggedIn && (
            <NotificationBell
              open={notifOpen}
              onOpenChange={(open) => {
                setNotifOpen(open);
                if (open) setProfilePopupOpen(false);
              }}
              isAdmin={isAdminRoute && showAdminMenu}
              isClub={showClubManagerNav && !isAdminRoute}
              isCtsv={showCtsvNav}
            />
          )}

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
                              {userProfile.role === 'student' && userProfile.course ? ` · ${userProfile.course}` : ''}
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
                        {isAdminRole(role) ? (
                          <AdminProfileMenu
                            activeItem=""
                            userProfile={userProfile}
                            onMenuAction={handleProfileMenuAction}
                            onLogout={handleLogout}
                          />
                        ) : showCtsvNav ? (
                          <CtsvProfileMenu
                            activeItem=""
                            userProfile={userProfile}
                            roleLabel={getRoleDisplayLabel(role)}
                            onMenuAction={handleProfileMenuAction}
                            onLogout={handleLogout}
                          />
                        ) : (
                          <ProfileSidebarMenu
                            activeItem=""
                            userProfile={userProfile}
                            onMenuAction={handleProfileMenuAction}
                            onLogout={handleLogout}
                            activeClub={activeClub}
                            showSwitchClub={isClubManagerRole(role)}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              <div className="auth-buttons site-header__auth-buttons">
                <Link to="/login" className="btn-auth btn-auth-login">Đăng nhập</Link>
                <Link to="/signup" className="btn-auth btn-auth-signup site-header__signup-btn">Đăng ký</Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>

    {mobileSearchOpen && showMobileSearch && (
      <div
        className="site-header__mobile-search-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm"
      >
        <form
          className="site-header__mobile-search-sheet-head"
          onSubmit={(e) => {
            e.preventDefault();
            handleMobileSearchSubmit();
          }}
        >
          <button
            type="button"
            className="site-header__mobile-search-cancel"
            onClick={() => setMobileSearchOpen(false)}
          >
            Hủy
          </button>
          <div className="site-header__mobile-search-field">
            <span className="site-header__mobile-search-field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
              </svg>
            </span>
            <input
              ref={mobileSearchInputRef}
              type="search"
              name="site-header-mobile-search"
              placeholder={resolvedSearchPlaceholder}
              value={mobileSearchDraft}
              onChange={(e) => setMobileSearchDraft(e.target.value)}
              className="site-header__mobile-search-input"
              enterKeyHint="search"
              autoComplete="off"
            />
            {trimmedMobileDraft && (
              <button
                type="button"
                className="site-header__mobile-search-clear"
                onClick={handleClearMobileSearch}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            className="site-header__mobile-search-submit"
            disabled={!hasPendingMobileSearch}
            aria-label="Tìm kiếm"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="site-header__mobile-search-body">
          {hasPendingMobileSearch ? (
            <p className="site-header__mobile-search-hint">
              {trimmedMobileDraft ? (
                <>
                  Nhấn <strong>Tìm kiếm</strong> để lọc theo từ khóa <strong>{trimmedMobileDraft}</strong>.
                </>
              ) : (
                <>
                  Nhấn <strong>Tìm kiếm</strong> để bỏ bộ lọc hiện tại.
                </>
              )}
            </p>
          ) : !trimmedSearchValue ? (
            <>
              <p className="site-header__mobile-search-label">Gợi ý tìm kiếm</p>
              <div className="site-header__mobile-search-chips">
                {mobileSearchSuggestions.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="site-header__mobile-search-chip"
                    onClick={() => handleMobileSuggestion(term)}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="site-header__mobile-search-hint">
              Đang lọc theo từ khóa <strong>{trimmedSearchValue}</strong>. Nhấn Hủy để xem danh sách.
            </p>
          )}
        </div>
      </div>
    )}

    {mobileMenuOpen && (
      <button
        type="button"
        className="site-header__mobile-backdrop site-header__mobile-backdrop--menu"
        aria-label="Đóng menu"
        onClick={closeMobileOverlays}
      />
    )}

    {showAdminMenu && !isAdminPortal && !sidebarControlled && (
      <AdminDrawerMenu
        open={adminDrawerOpen}
        onClose={() => setAdminDrawerOpen(false)}
      />
    )}

    <ClubSwitchModal
      open={clubSwitchOpen}
      clubs={managedClubs}
      activeClubId={activeClub?.id || ''}
      loading={managedClubsLoading}
      error={managedClubsError}
      onClose={() => setClubSwitchOpen(false)}
      onSelect={handleSelectManagedClub}
    />
    </>
  );
};

export default SiteHeader;
