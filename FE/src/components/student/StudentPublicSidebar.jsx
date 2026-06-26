import React from 'react';
import { resolveStudentPublicActiveNav } from '../../data/studentSidebarMenu';
import StudentPortalSidebarAside from './StudentPortalSidebarAside';

const StudentPublicSidebar = ({ open, pathname, userProfile, onClose }) => (
  <StudentPortalSidebarAside
    sidebarActive={open}
    activeMenu={resolveStudentPublicActiveNav(pathname)}
    userProfile={userProfile}
    onCloseSidebar={onClose}
  />
);

export default StudentPublicSidebar;
