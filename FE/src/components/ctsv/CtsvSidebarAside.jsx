import React from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import CtsvNavIcon from './CtsvNavIcon';
import {
  CTSV_NAV_ITEMS,
  isCtsvDesktop,
  isCtsvNavActive
} from './ctsvNavConfig';

const CtsvSidebarAside = ({
  sidebarOpen,
  onClose,
  userProfile,
  onLogout,
  pathname
}) => {
  const renderNavItems = () => {
    const out = [];
    let lastSection = null;
    CTSV_NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section">
            {item.section}
          </p>
        );
      }
      const linkClass = isCtsvNavActive(item.path, pathname)
        ? 'ctsv-nav-link active'
        : 'ctsv-nav-link';
      out.push(
        <Link
          key={item.path}
          to={item.path}
          className={linkClass}
          onClick={() => {
            if (!isCtsvDesktop()) onClose?.();
          }}
        >
          <span className="ctsv-nav-icon">
            <CtsvNavIcon type={item.icon} />
          </span>
          <span className="ctsv-nav-label">{item.label}</span>
        </Link>
      );
    });
    return out;
  };

  return (
    <aside className="ctsv-sidebar" aria-hidden={!sidebarOpen}>
      <div className="ctsv-sidebar-header">
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
        <button
          type="button"
          className="ctsv-sidebar-close"
          onClick={onClose}
          aria-label="Ẩn menu"
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
        <img src={userProfile.picture} alt="" className="ctsv-sidebar-avatar" />
        <div className="ctsv-sidebar-footer-text">
          <p className="ctsv-sidebar-user">{userProfile.fullname}</p>
          <p className="ctsv-sidebar-role">{getRoleDisplayLabel(getUserRole())}</p>
        </div>
      </div>
      <button type="button" className="ctsv-sidebar-logout" onClick={onLogout}>
        Đăng xuất
      </button>
    </aside>
  );
};

export default CtsvSidebarAside;
