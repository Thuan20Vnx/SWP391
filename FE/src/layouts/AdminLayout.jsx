import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import '../styles/admin-menu.css';
import '../styles/admin-dashboard.css';

const AdminLayout = ({ showToast }) => {
  const [adminSearch, setAdminSearch] = useState('');

  return (
    <div className="admin-page admin-layout">
      <SiteHeader
        activeNav="admin"
        searchPlaceholder="Tìm kiếm tài khoản, mã lệnh, log hệ thống..."
        searchValue={adminSearch}
        onSearchChange={setAdminSearch}
      />

      <Outlet context={{ showToast }} />

      <SiteFooter />

      <button type="button" className="admin-chat-fab" aria-label="Trợ lý ảo">
        <span className="admin-chat-fab__icon" aria-hidden="true">🤖</span>
        Bạn cần giúp gì?
      </button>
    </div>
  );
};

export default AdminLayout;
