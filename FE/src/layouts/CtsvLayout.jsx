import React, { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import defaultAvatar from '../assets/profile_avatar.png';
import { FE_LOGO, FE_LOGO_ALT } from '../assets/brand';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { clearSession, getRoleDisplayLabel, getUserRole, isCtsvRole, normalizeRole } from '../utils/auth';

const SIDEBAR_KEY = 'ctsvSidebarOpen';

const NavIcon = ({ type }) => {
  const common = {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  switch (type) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4.5-5.5 7-5.5s5.5 2 7 5.5" />
        </svg>
      );
    case 'partners':
      return (
        <svg {...common}>
          <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
          <rect x="8" y="6" width="8" height="13" rx="1.5" />
          <path d="M11 12l2 2 4-4.5" />
        </svg>
      );
    case 'create':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
          <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="0" />
        </svg>
      );
    case 'publish':
      return (
        <svg {...common}>
          <path d="M5 5h9l5 5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          <path d="M14 5v5h5" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );
    case 'announce':
      return (
        <svg {...common}>
          <path d="M12 4a3 3 0 0 1 3 3v4.5l2 2.5H7l2-2.5V7a3 3 0 0 1 3-3z" />
          <path d="M10 19h4" />
        </svg>
      );
    case 'proposals':
      return (
        <svg {...common}>
          <path d="M7 4h10l3 3v13H4V7l3-3z" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...common}>
          <path d="M5 19V9M12 19V5M19 19v-7" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
  }
};

const NAV_ITEMS = [
  { path: '/ctsv/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
  { path: '/profile', label: 'Hồ sơ', icon: 'profile' },
  { path: '/ctsv/partners', label: 'Xét duyệt đối tác', icon: 'partners' },
  { path: '/ctsv/events/create', label: 'Tạo sự kiện cấp trường', section: 'SỰ KIỆN', icon: 'create' },
  { path: '/ctsv/events', label: 'Publish sự kiện', icon: 'publish' },
  { path: '/ctsv/announcements/publish', label: 'Thông báo chính thức', icon: 'announce' },
  { path: '/ctsv/proposals', label: 'Đề xuất từ CLB', icon: 'proposals' },
  { path: '/ctsv/calendar', label: 'Lịch toàn trường', icon: 'calendar' },
  { path: '/ctsv/reports', label: 'Báo cáo sau SK', icon: 'reports' }
];

const readSidebarPref = () => {
  try {
    const v = sessionStorage.getItem(SIDEBAR_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return window.innerWidth >= 1024;
};

const CtsvLayout = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarPref);
  const [userProfile, setUserProfile] = useState({
    fullname: localStorage.getItem('userFullname') || 'Cán bộ CTSV',
    picture: defaultAvatar
  });

  const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

  useEffect(() => {
    if (!isCtsvRole()) {
      navigate('/', { replace: true });
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) return;
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.status === 200 ? res.json() : Promise.reject()))
      .then((data) => {
        const role = normalizeRole(data.user?.role);
        if (!isCtsvRole(role)) {
          navigate('/', { replace: true });
          return;
        }
        localStorage.setItem('userRole', role);
        setUserProfile({
          fullname: data.user.fullname || 'Cán bộ CTSV',
          picture: data.user.picture || defaultAvatar
        });
      })
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    const onResize = () => {
      if (!isDesktop() && sidebarOpen) {
        /* giữ overlay mở trên mobile nếu user đã mở */
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    try {
      sessionStorage.setItem(SIDEBAR_KEY, '0');
    } catch {
      /* ignore */
    }
  }, []);

  const handleLogout = () => {
    clearSession();
    showToast('Đã đăng xuất tài khoản CTSV.', 'info');
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/ctsv/dashboard') return location.pathname === path;
    if (path === '/ctsv/events') {
      return (
        location.pathname === '/ctsv/events' ||
        (location.pathname.startsWith('/ctsv/events/') && !location.pathname.includes('/create'))
      );
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const renderNavItems = () => {
    const out = [];
    let lastSection = null;
    NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section">
            {item.section}
          </p>
        );
      }
      const linkClass = isActive(item.path) ? 'ctsv-nav-link active' : 'ctsv-nav-link';
      out.push(
        <Link
          key={item.path}
          to={item.path}
          className={linkClass}
          onClick={() => {
            if (!isDesktop()) closeSidebar();
          }}
        >
          <span className="ctsv-nav-icon">
            <NavIcon type={item.icon} />
          </span>
          <span className="ctsv-nav-label">{item.label}</span>
        </Link>
      );
    });
    return out;
  };

  const shellClass = `ctsv-app-shell${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`;

  return (
    <div className={shellClass}>
      {!isDesktop() && sidebarOpen && (
        <button
          type="button"
          className="ctsv-drawer-backdrop"
          onClick={closeSidebar}
          aria-label="Đóng menu"
        />
      )}

      <aside className="ctsv-sidebar" aria-hidden={!sidebarOpen}>
        <div className="ctsv-sidebar-header">
          <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
          <button
            type="button"
            className="ctsv-sidebar-close"
            onClick={closeSidebar}
            aria-label="Ẩn menu"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <nav className="ctsv-sidebar-nav">{renderNavItems()}</nav>
        <div className="ctsv-sidebar-footer">
          <img src={userProfile.picture} alt="" className="ctsv-sidebar-avatar" />
          <div className="ctsv-sidebar-footer-text">
            <p className="ctsv-sidebar-user">{userProfile.fullname}</p>
            <p className="ctsv-sidebar-role">{getRoleDisplayLabel(getUserRole())}</p>
          </div>
        </div>
        <button type="button" className="ctsv-sidebar-logout" onClick={handleLogout}>
          Đăng xuất
        </button>
      </aside>

      <div className="ctsv-shell-main">
        <header className="ctsv-top-header">
          <button
            type="button"
            className="ctsv-menu-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Ẩn menu' : 'Hiện menu'}
            aria-expanded={sidebarOpen}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
              {sidebarOpen ? (
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
              ) : (
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
              )}
            </svg>
          </button>
          <Link to="/ctsv" className="ctsv-top-logo">
            <img src={FE_LOGO} alt={FE_LOGO_ALT} className="logo-img" />
          </Link>
          <nav className="ctsv-top-nav">
            <Link to="/ctsv" className={location.pathname === '/ctsv' ? 'active' : ''}>
              Trang chủ
            </Link>
            <Link
              to="/ctsv/events"
              className={location.pathname.includes('/ctsv/events') ? 'active' : ''}
            >
              Sự kiện
            </Link>
            <Link to="/ctsv/dashboard" className={location.pathname === '/ctsv/dashboard' ? 'active' : ''}>
              Bảng điều khiển
            </Link>
          </nav>
          <div className="ctsv-top-profile">
            <span className="ctsv-top-name">{userProfile.fullname}</span>
            <span className="profile-role profile-role-ctsv">{getRoleDisplayLabel(getUserRole())}</span>
          </div>
        </header>

        <main className="ctsv-main-content">
          <Outlet context={{ showToast, userProfile }} />
        </main>
      </div>
    </div>
  );
};

export default CtsvLayout;
