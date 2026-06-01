import React from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import defaultAvatar from '../../constants/defaultAvatar';
import { ADMIN_NAV_ITEMS } from '../../data/adminNavItems';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import { AdminMenuIcon } from './AdminMenuIcons';

const AdminSidebar = ({
  open,
  onClose,
  pathname,
  userProfile,
  overlay = false,
}) => {
  const isActive = (item) => {
    if (item.end) return pathname === item.path;
    if (item.path === '/admin/events') return pathname === '/admin/events';
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };

  const renderNavItems = () => {
    const out = [];
    let lastSection = null;
    ADMIN_NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section">
            {item.section}
          </p>
        );
        return;
      }
      if (!item.path) return;
      const active = isActive(item);
      out.push(
        <Link
          key={item.path}
          to={item.path}
          className={active ? 'ctsv-nav-link active' : 'ctsv-nav-link'}
        >
          <span className="ctsv-nav-icon">
            <AdminMenuIcon type={item.icon} />
          </span>
          <span className="ctsv-nav-label">{item.label}</span>
        </Link>
      );
    });
    return out;
  };

  const asideClass = `ctsv-sidebar admin-sidebar${overlay ? ' admin-sidebar--overlay' : ''}${open ? ' admin-sidebar--open' : ''}`;

  return (
    <aside className={asideClass} aria-hidden={!open} aria-label="Menu quản trị">
      <div className="ctsv-sidebar-header admin-sidebar-header">
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
        <button
          type="button"
          className={`ctsv-sidebar-close admin-sidebar-close-btn${overlay ? ' admin-sidebar-close-btn--always' : ''}`}
          onClick={onClose}
          aria-label="Đóng menu"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <nav className="ctsv-sidebar-nav">{renderNavItems()}</nav>
      <div className="ctsv-sidebar-footer">
        <img
          src={userProfile?.picture || defaultAvatar}
          alt=""
          className="ctsv-sidebar-avatar"
        />
        <div className="ctsv-sidebar-footer-text">
          <p className="ctsv-sidebar-user">{userProfile?.fullname || 'Quản trị viên'}</p>
          <p className="ctsv-sidebar-role profile-role-admin">{getRoleDisplayLabel(getUserRole())}</p>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
