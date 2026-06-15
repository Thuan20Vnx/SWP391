import React from 'react';
import defaultAvatar from '../../constants/defaultAvatar';
import { resolveUserAvatar } from '../../utils/image';
import StudentSidebarAside from './StudentSidebarAside';

const StudentPublicSidebar = ({ open, pathname, userProfile, onClose }) => {
  const profile = {
    fullname: userProfile?.fullname || 'Sinh viên',
    picture: resolveUserAvatar(userProfile, defaultAvatar),
  };

  return (
    <StudentSidebarAside
      sidebarOpen={open}
      onClose={onClose}
      userProfile={profile}
      pathname={pathname}
    />
  );
};

export default StudentPublicSidebar;
