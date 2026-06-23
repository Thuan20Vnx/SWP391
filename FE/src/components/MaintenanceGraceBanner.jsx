import React from 'react';
import { getMaintenanceGraceSecondsLeft } from '../utils/maintenanceGrace';

const MaintenanceGraceBanner = ({ status, now }) => {
  const secondsLeft = getMaintenanceGraceSecondsLeft(status, now);
  if (secondsLeft <= 0) return null;

  return (
    <div className="system-maint-grace-banner" role="alert" aria-live="assertive">
      <p className="system-maint-grace-banner__title">Hệ thống sắp bảo trì</p>
      <p className="system-maint-grace-banner__text">
        Vui lòng lưu công việc — trang sẽ tạm ngưng sau{' '}
        <strong>{secondsLeft}</strong> giây. {status.maintenanceMessage}
      </p>
    </div>
  );
};

export default MaintenanceGraceBanner;
