import React from 'react';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';
import {
  CLUB_NAV_ITEMS,
  isClubDesktop,
  isClubNavActive
} from './clubNavConfig';

const ClubSidebarAside = ({
  sidebarOpen,
  onClose,
  userProfile,
  activeNav,
  onNavSelect,
  hasNewNotifs = false
}) => {
  const renderNavItems = () => {
    const out = [];
    let lastSection = null;

    CLUB_NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section">
            {item.section}
          </p>
        );
      }

      const linkClass = isClubNavActive(item.key, activeNav)
        ? 'ctsv-nav-link club-nav-link active'
        : 'ctsv-nav-link club-nav-link';

      out.push(
        <button
          key={item.key}
          type="button"
          className={linkClass}
          onClick={() => {
            onNavSelect(item.key);
            if (!isClubDesktop()) onClose?.();
          }}
        >
          <span className="ctsv-nav-icon">
            <CtsvNavIcon type={item.icon} />
          </span>
          <span className="ctsv-nav-label">
            {item.label}
            {item.key === 'notifications' && hasNewNotifs && (
              <span className="club-nav-unread-dot" aria-hidden="true" />
            )}
          </span>
        </button>
      );
    });

    return out;
  };

  return (
    <aside className="ctsv-sidebar club-sidebar" aria-hidden={!sidebarOpen}>
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

export default ClubSidebarAside;
