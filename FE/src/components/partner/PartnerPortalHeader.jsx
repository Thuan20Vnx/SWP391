import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { resolveMobileSearchSuggestions } from '../../data/mobileSearchSuggestions';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import { logoutWithConfirm } from '../../utils/logout';
import { useCloseOnClickOutside } from '../../hooks/useCloseOnClickOutside';
import CtsvHamburgerButton from '../ctsv/CtsvHamburgerButton';
import NotificationBell from '../NotificationBell';
import PartnerProfileMenu from './PartnerProfileMenu';
import '../../styles/admin-menu.css';

const NAV_LINKS = [
  { to: '/partner', label: 'Trang chủ', match: (path) => path === '/partner' },
  {
    to: '/partner/events',
    label: 'Sự kiện',
    match: (path) =>
      (path === '/partner/events' || path.startsWith('/partner/events/')) &&
      !path.startsWith('/partner/join/events')
  },
  {
    to: '/partner/contracts',
    label: 'Hợp đồng',
    match: (path) => path.startsWith('/partner/contracts')
  },
  {
    to: '/partner/news',
    label: 'Tin tức',
    match: (path) => path.startsWith('/partner/news')
  }
];

const PARTNER_MENU_ROUTES = {
  profile: '/partner/profile',
  settings: '/partner/settings',
  events: '/partner/events',
  contracts: '/partner/contracts',
  'create-proposal': '/partner/proposals/create'
};

const resolveActiveMenuItem = (pathname) => {
  if (pathname.startsWith('/partner/settings')) return 'settings';
  if (pathname.startsWith('/partner/profile')) return 'profile';
  if (pathname.startsWith('/partner/join/events')) return '';
  if (pathname.startsWith('/partner/events')) return 'events';
  if (pathname.startsWith('/partner/contracts')) return 'contracts';
  return '';
};

const resolveMobilePageLabel = (pathname) => {
  if (pathname === '/partner' || pathname === '/partner/home') return 'Trang chủ';
  if (pathname.startsWith('/partner/dashboard')) return 'Đối tác';
  const activeLink = NAV_LINKS.find((item) => item.match(pathname));
  return activeLink?.label || 'Trang chủ';
};

const PartnerPortalHeader = ({
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchDraft, setMobileSearchDraft] = useState('');
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const wasMobileSearchOpenRef = useRef(false);
  const path = location.pathname;
  const activeMenuItem = useMemo(() => resolveActiveMenuItem(path), [path]);
  const mobilePageLabel = useMemo(() => resolveMobilePageLabel(path), [path]);
  const roleLabel = getRoleDisplayLabel(getUserRole());

  const hasSearchHandler = typeof onSearchChange === 'function';
  const showMobileSearch = hasSearchHandler;
  const searchToggleLabel = mobileSearchOpen ? 'Đóng tìm kiếm' : 'Mở tìm kiếm';
  const mobileSearchSuggestions = resolveMobileSearchSuggestions('', path, false);
  const trimmedSearchValue = searchQuery.trim();
  const trimmedMobileDraft = mobileSearchDraft.trim();
  const hasPendingMobileSearch = trimmedMobileDraft !== trimmedSearchValue;

  useEffect(() => {
    setProfilePopupOpen(false);
    setNotifOpen(false);
    setMobileNavOpen(false);
    setMobileSearchOpen(false);
  }, [path]);

  useEffect(() => {
    if (!sidebarOpen) return;
    setMobileSearchOpen(false);
    setMobileNavOpen(false);
    setProfilePopupOpen(false);
    setNotifOpen(false);
  }, [sidebarOpen]);

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
      setMobileSearchDraft(searchQuery);
    }
    wasMobileSearchOpenRef.current = mobileSearchOpen;
  }, [mobileSearchOpen, searchQuery]);

  useCloseOnClickOutside(profileRef, profilePopupOpen, () => setProfilePopupOpen(false));

  const handleMobileSearchSubmit = () => {
    if (!hasPendingMobileSearch) return;
    onSearchChange?.(trimmedMobileDraft);
    onSearchSubmit?.(trimmedMobileDraft);
    setMobileSearchOpen(false);
  };

  const handleMobileSuggestion = (term) => {
    setMobileSearchDraft(term);
    onSearchChange?.(term);
    onSearchSubmit?.(term);
    setMobileSearchOpen(false);
  };

  const handleClearMobileSearch = () => {
    setMobileSearchDraft('');
    mobileSearchInputRef.current?.focus();
  };

  const handleLogout = () => {
    logoutWithConfirm(navigate, {
      showToast,
      toastMessage: 'Đã đăng xuất tài khoản đối tác.'
    });
    setProfilePopupOpen(false);
  };

  const handleProfileMenuAction = (action) => {
    setProfilePopupOpen(false);
    const route = PARTNER_MENU_ROUTES[action];
    if (route) navigate(route);
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <>
      <header
        className={`home-header site-header site-header--with-shell ctsv-portal-header partner-portal-header${showSearch ? ' ctsv-portal-header--with-search' : ''}${sidebarOpen ? ' site-header--sidebar-open' : ''}${mobileSearchOpen ? ' site-header--mobile-search-open' : ''}`}
      >
        <div className="header-container">
          <div className="ctsv-header-start">
            <div className="ctsv-header-brand">
              <CtsvHamburgerButton
                onClick={onToggleSidebar}
                expanded={sidebarOpen}
                ariaLabel={sidebarOpen ? 'Ẩn menu điều hướng' : 'Mở menu điều hướng'}
              />
              <div
                className={`header-logo ctsv-header-logo${sidebarOpen ? ' is-collapsed' : ''}`}
                onClick={() => navigate('/partner')}
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
                to="/partner/dashboard"
                className={`nav-link nav-link-ctsv-pill partner-pill${path.startsWith('/partner/dashboard') ? ' active is-current' : ''}`}
                onClick={closeMobileNav}
              >
                Đối tác
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
                placeholder="Tìm kiếm sự kiện, hợp đồng…"
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
              className="site-header__nav-toggle partner-mobile-page-switch"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Chuyển trang"
              aria-expanded={mobileNavOpen}
            >
              <span className="partner-mobile-page-switch__label">{mobilePageLabel}</span>
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
                <path
                  d={mobileNavOpen ? 'M5.5 12.5 10 8l4.5 4.5' : 'M5.5 7.5 10 12l4.5-4.5'}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {showMobileSearch && (
              <button
                type="button"
                className="site-header__mobile-search-btn partner-mobile-search-trigger"
                aria-label={searchToggleLabel}
                aria-expanded={mobileSearchOpen}
                onClick={() => {
                  setMobileNavOpen(false);
                  setMobileSearchOpen((open) => !open);
                }}
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
                    <path
                      d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
            )}

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

            <NotificationBell
              open={notifOpen}
              onOpenChange={(open) => {
                setNotifOpen(open);
                if (open) setProfilePopupOpen(false);
              }}
              isPartner
            />

            <div className="auth-profile-wrapper" ref={profileRef}>
              <div className="profile-display-card">
                <button
                  type="button"
                  className={`profile-display-card-link ${profilePopupOpen ? 'profile-display-card-link--open' : ''}`}
                  title="Mở menu tài khoản đối tác"
                  onClick={() => {
                    setNotifOpen(false);
                    setProfilePopupOpen((v) => !v);
                  }}
                  aria-expanded={profilePopupOpen}
                  aria-haspopup="menu"
                >
                  <div className="profile-info-text">
                    <span className="profile-name">{userProfile.fullname}</span>
                    <span className="profile-role profile-role-ctsv partner-role-label">{roleLabel}</span>
                  </div>
                  <div className="profile-avatar-circle">
                    <img src={userProfile.picture} alt="" />
                  </div>
                </button>

                {profilePopupOpen && (
                  <>
                    <div className="profile-menu-backdrop" onClick={() => setProfilePopupOpen(false)} role="presentation" />
                    <div className="profile-menu-dropdown" role="menu" aria-label="Menu tài khoản đối tác">
                      <PartnerProfileMenu
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
                  <path
                    d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input
                ref={mobileSearchInputRef}
                type="search"
                name="partner-header-mobile-search"
                placeholder="Tìm kiếm sự kiện, hợp đồng…"
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
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                      fill="currentColor"
                    />
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
    </>
  );
};

export default PartnerPortalHeader;
