import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import defaultAvatar from '../../constants/defaultAvatar';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import { isClubDesktop, navigateClubNavItem, resolveClubPublicActiveNav } from './clubNavConfig';
import ClubSidebarNav from './ClubSidebarNav';

const ClubPublicSidebar = ({
  open,
  pathname,
  userProfile,
  onClose,
  hasNewNotifs = false,
  onNotificationsRead,
}) => {
  const navigate = useNavigate();
  const activeNav = useMemo(() => resolveClubPublicActiveNav(pathname), [pathname]);

  const handleNavSelect = useCallback(
    (key) => {
      navigateClubNavItem({
        key,
        navigate,
        pathname,
        onNotificationsRead,
      });
      if (!isClubDesktop()) onClose?.();
    },
    [navigate, onClose, onNotificationsRead, pathname]
  );

  return (
    <aside className="ctsv-sidebar club-sidebar club-public-sidebar" aria-hidden={!open}>
      <div className="ctsv-sidebar-header">
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
      </div>
      <ClubSidebarNav
        activeNav={activeNav}
        onNavSelect={handleNavSelect}
        hasNewNotifs={hasNewNotifs}
      />
      <div className="ctsv-sidebar-footer">
        <img src={userProfile?.picture || defaultAvatar} alt="" className="ctsv-sidebar-avatar" />
        <div className="ctsv-sidebar-footer-text">
          <p className="ctsv-sidebar-user">{userProfile?.fullname || 'Quản lý CLB'}</p>
          <p className="ctsv-sidebar-role">{getRoleDisplayLabel(getUserRole())}</p>
        </div>
      </div>
    </aside>
  );
};

export default ClubPublicSidebar;
