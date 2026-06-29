import React from 'react';
import { useClubParticipateLayout } from '../context/ClubParticipateLayoutContext';
import PublicAdminShell from '../layouts/PublicAdminShell';
import StudentPortalShell from '../layouts/StudentPortalShell';
import { isClubManagerRole } from '../utils/auth';

const mapMenuKeyToHeaderNav = (menuKey) => {
  if (menuKey === 'home') return 'home';
  if (menuKey === 'events') return 'events';
  if (menuKey === 'clubs') return 'clubs';
  if (menuKey === 'news') return 'news';
  return '';
};

const DashboardBody = ({ pageTitle, pageSubtitle, children }) => (
  <div className="dashboard-content-wrapper">
    {(pageTitle || pageSubtitle) && (
      <div className="page-header">
        {pageTitle && <h1>{pageTitle}</h1>}
        {pageSubtitle && <p>{pageSubtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const StudentDashboardLayout = ({
  activeMenu,
  pageTitle,
  pageSubtitle,
  children,
}) => {
  const inClubParticipateLayout = useClubParticipateLayout();

  if (isClubManagerRole() && inClubParticipateLayout) {
    return (
      <DashboardBody pageTitle={pageTitle} pageSubtitle={pageSubtitle}>
        {children}
      </DashboardBody>
    );
  }

  if (isClubManagerRole()) {
    return (
      <PublicAdminShell activeNav={mapMenuKeyToHeaderNav(activeMenu)}>
        <DashboardBody pageTitle={pageTitle} pageSubtitle={pageSubtitle}>
          {children}
        </DashboardBody>
      </PublicAdminShell>
    );
  }

  return (
    <StudentPortalShell
      activeMenu={activeMenu}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
    >
      {children}
    </StudentPortalShell>
  );
};

export default StudentDashboardLayout;
