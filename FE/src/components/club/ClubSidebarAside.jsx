import React from 'react';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import { isClubDesktop } from './clubNavConfig';
import ClubSidebarNav from './ClubSidebarNav';

const ClubSidebarAside = ({
  sidebarOpen,
  onClose,
  userProfile,
  activeNav,
  onNavSelect,
  hasNewNotifs = false,
}) => {
  const handleNavSelect = (key) => {
    onNavSelect(key);
    if (!isClubDesktop()) onClose?.();
  };

  return (
    <aside className="ctsv-sidebar club-sidebar" aria-hidden={!sidebarOpen}>
      <div className="ctsv-sidebar-header">
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
      </div>
      <ClubSidebarNav
        activeNav={activeNav}
        onNavSelect={handleNavSelect}
        hasNewNotifs={hasNewNotifs}
      />
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
