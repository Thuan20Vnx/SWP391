import React from 'react';
import { useLocation } from 'react-router-dom';
import useSystemMaintenanceStatus from '../hooks/useSystemMaintenanceStatus';
import { getUserRole, isStaffDuringMaintenance } from '../utils/auth';

const ALLOWED_PREFIXES = ['/login'];

const SystemMaintenanceGate = ({ children }) => {
  const { pathname } = useLocation();
  const role = getUserRole();
  const { status, loading } = useSystemMaintenanceStatus(45000);

  if (loading) return children;

  if (!status.maintenanceMode || isStaffDuringMaintenance(role)) {
    return children;
  }

  if (ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return children;
  }

  return (
    <main className="system-maint-page">
      <div className="system-maint-page__card">
        <h1>Hệ thống đang bảo trì</h1>
        <p>{status.maintenanceMessage}</p>
        <p className="system-maint-page__hint">
          Chỉ tài khoản Admin, CTSV và ICPDP có thể đăng nhập trong thời gian này.
        </p>
        <a href="/login" className="system-maint-page__btn">
          Về trang đăng nhập
        </a>
      </div>
    </main>
  );
};

export default SystemMaintenanceGate;
