import React, { memo } from 'react';
import defaultAvatar from '../../constants/defaultAvatar';

const ClubSidebarFooter = memo(({ picture, fullname, roleLabel }) => (
  <div className="ctsv-sidebar-footer">
    <img
      src={picture || defaultAvatar}
      alt=""
      className="ctsv-sidebar-avatar"
      loading="lazy"
      decoding="async"
    />
    <div className="ctsv-sidebar-footer-text">
      <p className="ctsv-sidebar-user">{fullname || 'Quản lý CLB'}</p>
      <p className="ctsv-sidebar-role">{roleLabel}</p>
    </div>
  </div>
));

ClubSidebarFooter.displayName = 'ClubSidebarFooter';

export default ClubSidebarFooter;
