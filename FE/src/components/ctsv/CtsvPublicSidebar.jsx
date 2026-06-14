import React from 'react';
import defaultAvatar from '../../constants/defaultAvatar';
import { resolveUserAvatar } from '../../utils/image';
import CtsvSidebarAside from './CtsvSidebarAside';

const CtsvPublicSidebar = ({ open, pathname, userProfile, onClose }) => {
  const profile = {
    fullname: userProfile?.fullname || 'Cán bộ CTSV',
    picture: resolveUserAvatar(userProfile, defaultAvatar),
  };

  return (
    <CtsvSidebarAside
      sidebarOpen={open}
      onClose={onClose}
      userProfile={profile}
      pathname={pathname}
    />
  );
};

export default CtsvPublicSidebar;
