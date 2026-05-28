import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import fptLogo from '../assets/fpt_logo.png';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { resolveUserAvatar } from '../utils/image';

const menuSections = [
  {
    items: [
      { key: 'dashboard', label: 'Tổng quan', path: '/dashboard', icon: 'grid' },
      { key: 'profile', label: 'Thông tin cá nhân', path: '/profile', icon: 'user' },
    ],
  },
  {
    header: 'Sự kiện',
    items: [
      { key: 'events', label: 'Tìm kiếm & Duyệt sự kiện', path: '/events', icon: 'search' },
      { key: 'my-events', label: 'Sự kiện của tôi', path: '/my-events', icon: 'folder' },
      { key: 'schedule', label: 'Quản lý lịch trình', path: '/schedule', icon: 'calendar' },
    ],
  },
  {
    header: 'Tiện ích',
    items: [
      { key: 'reviews', label: 'Đánh giá sự kiện', path: '/event-reviews', icon: 'star' },
      { key: 'announcements', label: 'Thông báo', path: '/announcements', icon: 'bell' },
    ],
  },
];

const MenuIcon = ({ type }) => {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

  switch (type) {
    case 'grid':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...props}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'star':
      return (
        <svg {...props}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...props}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
  }
};

const StudentDashboardLayout = ({
  activeMenu,
  pageTitle,
  pageSubtitle,
  breadcrumbLabel,
  children,
  showToast,
}) => {
  const navigate = useNavigate();
  const [sidebarActive, setSidebarActive] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileData, setProfileData] = useState({ fullname: '', picture: '' });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setProfileLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const user = data.user || {};
        setProfileData({
          fullname: user.fullname || '',
          picture: resolveUserAvatar(user, ''),
        });
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const handleScanClick = () => {
    showToast?.('Tính năng quét QR check-in đang được phát triển.', 'info');
  };

  const displayAvatar = profileData.picture || defaultAvatar;
  const currentCrumb = breadcrumbLabel || pageTitle;

  return (
    <div className="profile-page">
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
                <span className="sidebar-user-name">{profileData.fullname || 'Người dùng'}</span>
              )}
            </div>
          </button>

          <nav className="sidebar-menu">
            {menuSections.map((section) => (
              <div className="menu-section" key={section.header || 'main'}>
                {section.header && <span className="menu-header">{section.header}</span>}
                {section.items.map((item) => (
                  <Link
                    key={item.key}
                    to={item.path}
                    className={`menu-item ${activeMenu === item.key ? 'active' : ''}`}
                    onClick={() => setSidebarActive(false)}
                  >
                    <div className="menu-item-content">
                      <MenuIcon type={item.icon} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ))}

            <button type="button" className="btn-scan-aside" onClick={handleScanClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M21 14v4h-4" />
              </svg>
              <span>Quét mã tham gia</span>
            </button>
          </nav>

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
            </div>

            <div className="navbar-right">
              <button
                type="button"
                className="btn-icon-nav"
                aria-label="Xem thông báo"
                onClick={() => navigate('/announcements')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
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
                    <span className="navbar-user-name">{profileData.fullname || 'Người dùng'}</span>
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
