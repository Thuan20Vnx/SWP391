import React from 'react';
import StudentPortalShell from '../layouts/StudentPortalShell';

const StudentDashboardLayout = ({
  activeMenu,
  pageTitle,
  pageSubtitle,
  children,
}) => (
  <StudentPortalShell
    activeMenu={activeMenu}
    pageTitle={pageTitle}
    pageSubtitle={pageSubtitle}
  >
    {children}
  </StudentPortalShell>
);

export default StudentDashboardLayout;
