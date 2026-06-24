import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';

import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';

import { logoutWithConfirm } from '../../utils/logout';

import { useCloseOnClickOutside } from '../../hooks/useCloseOnClickOutside';

import CtsvHamburgerButton from '../ctsv/CtsvHamburgerButton';

import NotificationBell from '../NotificationBell';

import IcpdpProfileMenu from './IcpdpProfileMenu';

import '../../styles/admin-menu.css';



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

  settings: '/icpdp/settings'

};



const resolveActiveMenuItem = (pathname) => {

  if (pathname.startsWith('/icpdp/settings')) return 'settings';

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

  const [notifOpen, setNotifOpen] = useState(false);

  const profileRef = useRef(null);

  const path = location.pathname;

  const activeMenuItem = useMemo(() => resolveActiveMenuItem(path), [path]);

  const roleLabel = getRoleDisplayLabel(getUserRole());



  const activeNavItem = useMemo(() => {

    const matched = NAV_LINKS.find((item) => item.match(path));

    if (matched) return matched;

    if (path.startsWith('/icpdp/dashboard')) return { label: 'IC-PDP' };

    return NAV_LINKS[0];

  }, [path]);



  useEffect(() => {

    setProfilePopupOpen(false);

    setNotifOpen(false);

    setMobileNavOpen(false);

  }, [path]);



  useEffect(() => {

    if (sidebarOpen) setMobileNavOpen(false);

  }, [sidebarOpen]);



  useCloseOnClickOutside(profileRef, profilePopupOpen, () => setProfilePopupOpen(false));



  const handleLogout = () => {

    logoutWithConfirm(navigate, {

      showToast,

      toastMessage: 'Đã đăng xuất tài khoản IC-PDP.'

    });

    setProfilePopupOpen(false);

  };



  const handleProfileMenuAction = (action) => {

    setProfilePopupOpen(false);

    const route = ICPDP_MENU_ROUTES[action];

    if (route) navigate(route);

  };



  const closeMobileNav = () => setMobileNavOpen(false);



  return (

    <header

      className={`home-header site-header site-header--with-shell ctsv-portal-header icpdp-portal-header${showSearch ? ' ctsv-portal-header--with-search' : ''}${sidebarOpen ? ' site-header--sidebar-open' : ''}`}

    >

      <div className="header-container site-header__container">

        <div className="ctsv-header-start site-header__start">

          <div className="ctsv-header-brand">

            <CtsvHamburgerButton

              className="mobile-hamburger-btn"

              onClick={onToggleSidebar}

              expanded={sidebarOpen}

              ariaLabel={sidebarOpen ? 'Ẩn menu điều hướng' : 'Mở menu điều hướng'}

            />



            <div

              className={`header-logo ctsv-header-logo site-header__logo${sidebarOpen ? ' is-collapsed' : ''}`}

              onClick={() => navigate('/icpdp')}

              role="presentation"

            >

              <img src={FE_LOGO} alt={FE_LOGO_ALT} className="logo-img" />

            </div>

          </div>



          <nav

            className={`header-nav site-header__nav ctsv-header-nav${mobileNavOpen ? ' mobile-active' : ''}`}

            aria-label="Điều hướng IC-PDP"

          >

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

          <div className="header-search-box ctsv-header-search site-header__search">

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

              className="search-input site-header__search-input"

            />

          </div>

        )}



        <div className="header-actions">

          <button

            type="button"

            className="site-header__nav-toggle"

            onClick={() => setMobileNavOpen((open) => !open)}

            aria-label={mobileNavOpen ? 'Đóng menu trang' : 'Mở menu trang'}

            aria-expanded={mobileNavOpen}

          >

            <span className="site-header__nav-toggle-label">{activeNavItem.label}</span>

            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">

              {mobileNavOpen ? (

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



          <NotificationBell

            open={notifOpen}

            onOpenChange={(open) => {

              setNotifOpen(open);

              if (open) setProfilePopupOpen(false);

            }}

            isIcpdp

          />



          <div className="auth-profile-wrapper" ref={profileRef}>

            <div className="profile-display-card">

              <button

                type="button"

                className={`profile-display-card-link ${profilePopupOpen ? 'profile-display-card-link--open' : ''}`}

                title="Mở menu tài khoản IC-PDP"

                onClick={() => {

                  setNotifOpen(false);

                  setProfilePopupOpen((v) => !v);

                }}

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

