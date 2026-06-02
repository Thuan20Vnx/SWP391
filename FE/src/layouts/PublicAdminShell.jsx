import React, { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopHeader from '../components/admin/AdminTopHeader';
import SiteHeader from '../components/SiteHeader';
import useUserProfile from '../hooks/useUserProfile';
import { getUserRole, isAdminRole, normalizeRole } from '../utils/auth';
import { readSidebarPref, writeSidebarPref } from '../utils/adminSidebarStorage';
import '../styles/admin-menu.css';

/**
 * Shell giống AdminLayout cho trang công khai (Trang chủ, Sự kiện, CLB, Tin tức):
 * sidebar mở → nội dung thu; đóng → tràn full width.
 */
const PublicAdminShell = ({ children, ...headerProps }) => {
  const { pathname } = useLocation();
  const { isLoggedIn, userProfile } = useUserProfile();
  const role = normalizeRole(userProfile.role || getUserRole());
  const showAdminMenu = isLoggedIn && isAdminRole(role);

  const [sidebarOpen, setSidebarOpen] = useState(readSidebarPref);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      writeSidebarPref(next);
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    writeSidebarPref(false);
  }, []);

  if (!showAdminMenu) {
    return (
      <>
        <SiteHeader {...headerProps} />
        {children}
      </>
    );
  }

  const shellClass = `ctsv-app-shell admin-app-shell admin-public-shell${
    sidebarOpen ? ' sidebar-open' : ' sidebar-closed'
  }`;

  return (
    <div className={shellClass}>
      {sidebarOpen && (
        <button
          type="button"
          className="ctsv-drawer-backdrop admin-sidebar-backdrop"
          onClick={closeSidebar}
          aria-label="Đóng menu"
        />
      )}

      <AdminSidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        pathname={pathname}
        userProfile={userProfile}
      />

      <div className="ctsv-shell-main admin-shell-main public-shell-main">
        <AdminTopHeader
          {...headerProps}
          sidebarToggle={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        {children}
      </div>
    </div>
  );
};

export default PublicAdminShell;
