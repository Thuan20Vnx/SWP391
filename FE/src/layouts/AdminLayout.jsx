import React, { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ChatbotFloating from '../components/ChatbotFloating';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import '../styles/admin-menu.css';
import '../styles/admin-dashboard.css';

const AdminLayout = ({ showToast }) => {
  const [adminSearch, setAdminSearch] = useState('');
  const { pathname } = useLocation();

  const searchPlaceholder = useMemo(() => {
    if (pathname.startsWith('/admin/accounts')) {
      return 'Tìm kiếm tài khoản, email, MSSV...';
    }
    if (pathname.startsWith('/admin/event-requests')) {
      return 'Tìm CLB, tên sự kiện, loại yêu cầu...';
    }
    return 'Tìm kiếm tài khoản, mã lệnh, log hệ thống...';
  }, [pathname]);

  return (
    <div className="admin-page admin-layout">
      <SiteHeader
        activeNav="admin"
        searchPlaceholder={searchPlaceholder}
        searchValue={adminSearch}
        onSearchChange={setAdminSearch}
      />

      <Outlet context={{ showToast, adminSearch, setAdminSearch }} />

      <SiteFooter />

      <ChatbotFloating context="admin" />
    </div>
  );
};

export default AdminLayout;
