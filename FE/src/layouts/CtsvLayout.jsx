import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import defaultAvatar from '../assets/profile_avatar.png';
import { FE_LOGO, FE_LOGO_ALT } from '../assets/brand';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { clearSession, getRoleDisplayLabel, getUserRole, isCtsvRole, normalizeRole } from '../utils/auth';

const NAV_ITEMS = [
  { path: '/ctsv/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
  { path: '/profile', label: 'Hồ sơ', icon: 'profile', external: true },
  { path: '/ctsv/partners', label: 'Xét duyệt đối tác', icon: 'partners' },
  { path: '/ctsv/events/create', label: 'Tạo sự kiện cấp trường', icon: 'create', section: 'SỰ KIỆN' },
  { path: '/ctsv/events', label: 'Publish sự kiện', icon: 'publish' },
  { path: '/ctsv/announcements/publish', label: 'Thông báo chính thức', icon: 'announce' },
  { path: '/ctsv/proposals', label: 'Đề xuất từ CLB', icon: 'proposals' },
  { path: '/ctsv/calendar', label: 'Lịch toàn trường', icon: 'calendar' },
  { path: '/ctsv/reports', label: 'Báo cáo sau SK', icon: 'reports' }
];

const CtsvLayout = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({
    fullname: localStorage.getItem('userFullname') || 'Cán bộ CTSV',
    picture: defaultAvatar
  });

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

  const handleLogout = () => {
    clearSession();
    showToast('Đã đăng xuất tài khoản CTSV.', 'info');
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/ctsv/dashboard') return location.pathname === path;
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
        <Link key={item.path} to={item.path} className={linkClass} onClick={() => setDrawerOpen(false)}>
          <span className="ctsv-nav-link-label">{item.label}</span>
        </Link>
      );
    });
    return out;
  };

  return (
    <div className="ctsv-app-layout">
      <header className="ctsv-top-header">
        <button type="button" className="ctsv-menu-toggle" onClick={() => setDrawerOpen(true)} aria-label="Menu">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
          </svg>
        </button>
        <Link to="/ctsv" className="ctsv-top-logo">
          <img src={FE_LOGO} alt={FE_LOGO_ALT} className="logo-img" />
        </Link>
        <nav className="ctsv-top-nav">
          <Link to="/ctsv" className={location.pathname === '/ctsv' ? 'active' : ''}>Trang chủ</Link>
          <Link to="/ctsv/events" className={location.pathname.includes('/ctsv/events') ? 'active' : ''}>Sự kiện</Link>
          <Link to="/ctsv/dashboard" className={location.pathname === '/ctsv/dashboard' ? 'active' : ''}>Bảng điều khiển</Link>
        </nav>
        <div className="ctsv-top-profile">
          <span className="ctsv-top-name">{userProfile.fullname}</span>
          <span className="profile-role profile-role-ctsv">{getRoleDisplayLabel(getUserRole())}</span>
          <button type="button" className="small-logout-btn" onClick={handleLogout} title="Đăng xuất">
            Đăng xuất
          </button>
        </div>
      </header>

      {drawerOpen && (
        <button type="button" className="ctsv-drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="Đóng" />
      )}

      <aside className={`ctsv-sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="ctsv-sidebar-header">
          <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
          <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Đóng menu">×</button>
        </div>
        <nav className="ctsv-sidebar-nav">{renderNavItems()}</nav>
        <div className="ctsv-sidebar-footer">
          <img src={userProfile.picture} alt="" className="ctsv-sidebar-avatar" />
          <div>
            <p className="ctsv-sidebar-user">{userProfile.fullname}</p>
            <p className="ctsv-sidebar-role">{getRoleDisplayLabel(getUserRole())}</p>
          </div>
        </div>
      </aside>

      <main className="ctsv-main-content">
        <Outlet context={{ showToast, userProfile }} />
      </main>
    </div>
  );
};

export default CtsvLayout;
