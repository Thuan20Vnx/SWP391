import React from 'react';
import { isClubDesktop } from './clubNavConfig';
import ClubSidebarShell from './ClubSidebarShell';

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
    <ClubSidebarShell
      open={sidebarOpen}
      userProfile={userProfile}
      onClose={onClose}
      activeNav={activeNav}
      onNavSelect={handleNavSelect}
      hasNewNotifs={hasNewNotifs}
    />
  );
};

export default ClubSidebarAside;
