import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import defaultAvatar from '../../constants/defaultAvatar';
import useUserProfile, { clearUserProfileCache } from '../../hooks/useUserProfile';
import { dispatchAuthChanged } from '../../utils/authEvents';
import { AdminMenuIcon } from './AdminMenuIcons';
import '../../styles/admin-menu.css';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', to: '/admin', icon: 'dashboard', end: true },
  { key: 'accounts', label: 'Kiểm soát tài khoản', to: '/admin/accounts', icon: 'accounts' },
  { key: 'system', label: 'Kiểm soát hệ thống', to: '/admin/system', icon: 'system' },
  { key: 'data', label: 'Quản lý cơ sở & danh mục', to: '/admin/data', icon: 'data' },
  { key: 'partners', label: 'Đối tác', to: '/admin/partners', icon: 'partners' },
  { key: 'analytics', label: 'Đánh giá & Phân tích', to: '/admin/analytics', icon: 'analytics' },
  { key: 'events', label: 'Duyệt đề xuất sự kiện', to: '/admin/events', icon: 'events' },
];

const AdminDrawerMenu = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { userProfile } = useUserProfile();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    clearUserProfileCache();
    dispatchAuthChanged();
    onClose();
    navigate('/');
  };

  if (!open) return null;

  return (
    <>
      <div className="admin-drawer-backdrop" onClick={onClose} role="presentation" />
      <aside className="admin-drawer" role="dialog" aria-label="Menu quản trị viên">
        <div className="admin-drawer__header">
          <div className="admin-drawer__brand">
            <img src={FE_LOGO} alt={FE_LOGO_ALT} className="admin-drawer__logo" />
            <p className="admin-drawer__title">Quản trị viên</p>
          </div>
          <button type="button" className="admin-drawer__close" onClick={onClose} aria-label="Đóng menu">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="admin-drawer__nav">
          {MENU_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-drawer__link${isActive ? ' admin-drawer__link--active' : ''}`
              }
              onClick={onClose}
            >
              <AdminMenuIcon type={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-drawer__footer">
          <div className="admin-drawer__user">
            <img
              src={userProfile.picture || defaultAvatar}
              alt=""
              className="admin-drawer__avatar"
            />
            <p className="admin-drawer__name">{userProfile.fullname || 'Quản trị viên'}</p>
          </div>
          <button type="button" className="admin-drawer__logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminDrawerMenu;
