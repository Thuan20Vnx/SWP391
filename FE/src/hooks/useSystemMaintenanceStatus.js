import { useCallback, useEffect, useState } from 'react';
import { fetchPublicSystemStatus } from '../services/adminApi';

export const SYSTEM_MAINTENANCE_CHANGED = 'fevents:system-maintenance-changed';

const DEFAULT_STATUS = {
  maintenanceMode: false,
  publicAnnouncements: true,
  maintenanceMessage: 'Hệ thống đang bảo trì định kỳ. Vui lòng quay lại sau.',
  maintenanceActivatedAt: null,
  maintenanceGraceSeconds: 15,
};

export const notifySystemMaintenanceChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYSTEM_MAINTENANCE_CHANGED));
  }
};

const useSystemMaintenanceStatus = (pollMs = 5000) => {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetchPublicSystemStatus()
      .then((data) => {
        setStatus({
          maintenanceMode: Boolean(data.maintenanceMode),
          publicAnnouncements: data.publicAnnouncements !== false,
          maintenanceMessage:
            data.maintenanceMessage || DEFAULT_STATUS.maintenanceMessage,
          maintenanceActivatedAt: data.maintenanceActivatedAt || null,
          maintenanceGraceSeconds: Number(data.maintenanceGraceSeconds) || 15,
          updatedAt: data.updatedAt || null,
        });
      })
      .catch(() => setStatus(DEFAULT_STATUS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    if (!pollMs) return undefined;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  useEffect(() => {
    const onChanged = () => refresh();
    window.addEventListener(SYSTEM_MAINTENANCE_CHANGED, onChanged);
    return () => window.removeEventListener(SYSTEM_MAINTENANCE_CHANGED, onChanged);
  }, [refresh]);

  return { status, loading, refresh };
};

export default useSystemMaintenanceStatus;
