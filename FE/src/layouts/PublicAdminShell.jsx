import React, { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopHeader from '../components/admin/AdminTopHeader';
import ClubPublicSidebar from '../components/club/ClubPublicSidebar';
import { persistClubPublicSidebarOpen, readClubPublicSidebarPref } from '../components/club/clubNavConfig';
import SiteHeader from '../components/SiteHeader';
import useUserProfile from '../hooks/useUserProfile';
import { getUserRole, isAdminRole, isClubManagerRole, normalizeRole } from '../utils/auth';
import { readSidebarPref, writeSidebarPref } from '../utils/adminSidebarStorage';
import '../styles/admin-menu.css';
import '../styles/club-portal.css';

const PublicAdminShell = ({ children, ...headerProps }) => {
  const { pathname } = useLocation();
  const { isLoggedIn, userProfile } = useUserProfile();
  const role = normalizeRole(userProfile.role || getUserRole());
  const showAdminMenu = isLoggedIn && isAdminRole(role);
  const showClubShell = isLoggedIn && isClubManagerRole(role) && !showAdminMenu;

  const [adminSidebarOpen, setAdminSidebarOpen] = useState(readSidebarPref);
  const [clubSidebarOpen, setClubSidebarOpen] = useState(readClubPublicSidebarPref);

  const toggleAdminSidebar = useCallback(() => {
    setAdminSidebarOpen((prev) => { const next = !prev; writeSidebarPref(next); return next; });
  }, []);
  const closeAdminSidebar = useCallback(() => { setAdminSidebarOpen(false); writeSidebarPref(false); }, []);
  const toggleClubSidebar = useCallback(() => {
    setClubSidebarOpen((prev) => { const next = !prev; persistClubPublicSidebarOpen(next); return next; });
  }, []);
  const closeClubSidebar = useCallback(() => { setClubSidebarOpen(false); persistClubPublicSidebarOpen(false); }, []);

  if (!showAdminMenu && !showClubShell) {
    return (<><SiteHeader {...headerProps} />{children}</>);
  }

  if (showClubShell) {
    const shellClass = `ctsv-app-shell club-app-shell club-public-shell${clubSidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`;
    return (
      <div className={shellClass}>
        {clubSidebarOpen && <button type="button" className="ctsv-drawer-backdrop" onClick={closeClubSidebar} aria-label="Đóng menu" />}
        <ClubPublicSidebar open={clubSidebarOpen} pathname={pathname} userProfile={userProfile} onClose={closeClubSidebar} />
        <div className="ctsv-shell-main">
          <SiteHeader {...headerProps} onTogglePortalSidebar={toggleClubSidebar} portalSidebarOpen={clubSidebarOpen} />
          {children}
        </div>
      </div>
    );
  }

  const shellClass = `ctsv-app-shell admin-app-shell admin-public-shell${adminSidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`;
  return (
    <div className={shellClass}>
      {adminSidebarOpen && <button type="button" className="ctsv-drawer-backdrop admin-sidebar-backdrop" onClick={closeAdminSidebar} aria-label="Đóng menu" />}
      <AdminSidebar open={adminSidebarOpen} onClose={closeAdminSidebar} pathname={pathname} userProfile={userProfile} />
      <div className="ctsv-shell-main admin-shell-main public-shell-main">
        <AdminTopHeader {...headerProps} sidebarToggle={toggleAdminSidebar} sidebarOpen={adminSidebarOpen} />
        {children}
      </div>
    </div>
  );
};

export default PublicAdminShell;
