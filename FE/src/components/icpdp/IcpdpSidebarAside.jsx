import React from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';
import {
  ICPDP_NAV_ITEMS,
  isIcpdpDesktop,
  isIcpdpNavActive
} from './icpdpNavConfig';

const IcpdpSidebarAside = ({
  sidebarOpen,
  onClose,
  userProfile,
  onLogout,
  pathname
}) => {
  const renderNavItems = () => {
    const out = [];
    let lastSection = null;
    ICPDP_NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section icpdp-nav-section">
            {item.section}
          </p>
        );
      }
      const linkClass = isIcpdpNavActive(item.path, pathname)
        ? 'ctsv-nav-link icpdp-nav-link active'
        : 'ctsv-nav-link icpdp-nav-link';
      out.push(
        <Link
          key={item.path}
          to={item.path}
          className={linkClass}
          onClick={() => {
            if (!isIcpdpDesktop()) onClose?.();
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
    <aside className="ctsv-sidebar icpdp-sidebar" aria-hidden={!sidebarOpen}>
      <div className="ctsv-sidebar-header icpdp-sidebar-header">
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
      <button type="button" className="ctsv-sidebar-logout icpdp-sidebar-logout" onClick={onLogout}>
        Đăng xuất
      </button>
    </aside>
  );
};

export default IcpdpSidebarAside;
