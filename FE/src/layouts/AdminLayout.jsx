import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminTopHeader from '../components/admin/AdminTopHeader';
import AdminSidebar from '../components/admin/AdminSidebar';
import SiteFooter from '../components/SiteFooter';
import ChatbotFloating from '../components/ChatbotFloating';
import TimelineLiveBanner from '../components/timeline/TimelineLiveBanner';
import { isTimelineLiveRoute } from '../utils/timelineLiveEvents';
import useUserProfile from '../hooks/useUserProfile';
import { readSidebarPref, writeSidebarPref } from '../utils/adminSidebarStorage';
import '../styles/admin-menu.css';
import '../styles/admin-dashboard.css';

const AdminLayout = ({ showToast }) => {
  const { pathname } = useLocation();
  const [adminSearch, setAdminSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarPref);
  const { userProfile } = useUserProfile();
  const headerSearchSubmitRef = useRef(null);

  // Reset từ khóa tìm kiếm trên header khi chuyển trang
  useEffect(() => {
    setAdminSearch('');
    headerSearchSubmitRef.current = null;
  }, [pathname]);

  const searchPlaceholder = useMemo(() => {
    if (pathname.startsWith('/admin/accounts')) {
      return 'Tìm kiếm tài khoản, email, MSSV...';
    }
    if (pathname.startsWith('/admin/event-requests')) {
      return 'Tìm CLB, tên sự kiện, loại yêu cầu...';
    }
    return 'Tìm kiếm tài khoản, mã lệnh, log hệ thống...';
  }, [pathname]);

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

  const shellClass = `ctsv-app-shell admin-app-shell${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`;

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

      <div className="ctsv-shell-main admin-shell-main">
        <AdminTopHeader
          searchPlaceholder={searchPlaceholder}
          searchValue={adminSearch}
          onSearchChange={setAdminSearch}
          onSearchKeyDown={(e) => {
            if (e.key === 'Enter') headerSearchSubmitRef.current?.();
          }}
          sidebarToggle={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />

        <div className="admin-layout admin-shell-content">
          <TimelineLiveBanner active={isTimelineLiveRoute(pathname)} />
          <Outlet context={{
            showToast,
            adminSearch,
            setAdminSearch,
            // Alias để các trang CTSV/IC-PDP dùng chung hợp đồng với CtsvLayout
            headerSearch: adminSearch,
            setHeaderSearch: setAdminSearch,
            registerHeaderSearchSubmit: (fn) => { headerSearchSubmitRef.current = fn; },
          }} />
          <SiteFooter />
        </div>
        <ChatbotFloating context="admin" />
      </div>
    </div>
  );
};

export default AdminLayout;
