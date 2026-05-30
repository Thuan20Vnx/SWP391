import React, { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

      <button type="button" className="admin-chat-fab" aria-label="Trợ lý ảo">
        <span className="admin-chat-fab__icon" aria-hidden="true">🤖</span>
        Bạn cần giúp gì?
      </button>
    </div>
  );
};

export default AdminLayout;
