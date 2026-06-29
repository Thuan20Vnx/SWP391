import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { isClubDesktop, navigateClubNavItem, resolveClubPublicActiveNav } from './clubNavConfig';
import ClubSidebarShell from './ClubSidebarShell';

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
    <ClubSidebarShell
      open={open}
      asideClassName="ctsv-sidebar club-sidebar club-public-sidebar"
      userProfile={userProfile}
      onClose={onClose}
      activeNav={activeNav}
      onNavSelect={handleNavSelect}
      hasNewNotifs={hasNewNotifs}
    />
  );
};

export default ClubPublicSidebar;
