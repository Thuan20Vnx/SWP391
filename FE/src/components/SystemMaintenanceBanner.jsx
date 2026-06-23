import React from 'react';
import useSystemMaintenanceStatus from '../hooks/useSystemMaintenanceStatus';
import { isMaintenanceGraceActive } from '../utils/maintenanceGrace';

const IconWarn = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M12 2L2 20h20L12 2zm0 6v6m0 4h.01"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const SystemMaintenanceBanner = () => {
  const { status } = useSystemMaintenanceStatus(5000);

  const showBanner =
    status.publicAnnouncements &&
    (status.maintenanceMode || status.maintenanceMessage);

  if (!showBanner || !status.maintenanceMode) return null;
  if (isMaintenanceGraceActive(status)) return null;

  return (
    <div className="alert-banner system-maint-banner" role="alert">
      <IconWarn />
      <span>{status.maintenanceMessage}</span>
    </div>
  );
};

export default SystemMaintenanceBanner;
