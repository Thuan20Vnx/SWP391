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
      </div>
      <nav className="ctsv-sidebar-nav">{renderNavItems()}</nav>
      <div className="ctsv-sidebar-footer">
        <img src={userProfile.picture} alt="" className="ctsv-sidebar-avatar" />
        <div className="ctsv-sidebar-footer-text">
          <p className="ctsv-sidebar-user">{userProfile.fullname}</p>
          <p className="ctsv-sidebar-role">{getRoleDisplayLabel(getUserRole())}</p>
        </div>
      </div>
    </aside>
  );
};

export default CtsvSidebarAside;
