import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useSystemMaintenanceStatus from '../hooks/useSystemMaintenanceStatus';
import { getUserRole, isStaffDuringMaintenance } from '../utils/auth';
import {
  isMaintenanceBlocking,
  isMaintenanceGraceActive,
} from '../utils/maintenanceGrace';
import MaintenanceGraceBanner from './MaintenanceGraceBanner';

const ALLOWED_PREFIXES = ['/login'];

const SystemMaintenanceGate = ({ children }) => {
  const { pathname } = useLocation();
  const role = getUserRole();
  const { status, loading } = useSystemMaintenanceStatus(5000);
  const [now, setNow] = useState(() => Date.now());

  const staff = isStaffDuringMaintenance(role);
  const inGrace = !staff && status.maintenanceMode && isMaintenanceGraceActive(status, now);
  const blocking = !staff && isMaintenanceBlocking(status, now);

  useEffect(() => {
    if (!status.maintenanceMode || staff) return undefined;
    if (!isMaintenanceGraceActive(status, Date.now())) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status.maintenanceMode, status.maintenanceActivatedAt, staff]);

  if (loading) return children;

  if (!blocking) {
    return (
      <>
        {inGrace && <MaintenanceGraceBanner status={status} now={now} />}
        {children}
      </>
    );
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
