import React from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';
import {
  PARTNER_NAV_ITEMS,
  isPartnerDesktop,
  isPartnerNavActive
} from './partnerNavConfig';

const PartnerSidebarAside = ({
  sidebarOpen,
  onClose,
  userProfile,
  onLogout,
  pathname
}) => {
  const renderNavItems = () => {
    const out = [];
    let lastSection = null;
    PARTNER_NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section partner-nav-section">
            {item.section}
          </p>
        );
      }
      const linkClass = isPartnerNavActive(item.path, pathname)
        ? 'ctsv-nav-link partner-nav-link active'
        : 'ctsv-nav-link partner-nav-link';
      out.push(
        <Link
          key={item.path}
          to={item.path}
          className={linkClass}
          onClick={() => {
            if (!isPartnerDesktop()) onClose?.();
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
    <aside className="ctsv-sidebar partner-sidebar" aria-hidden={!sidebarOpen}>
      <div className="ctsv-sidebar-header partner-sidebar-header">
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
      <button type="button" className="ctsv-sidebar-logout partner-sidebar-logout" onClick={onLogout}>
        Đăng xuất
      </button>
    </aside>
  );
};

export default PartnerSidebarAside;
