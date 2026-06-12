import { useCallback, useEffect, useState } from 'react';
import { fetchPublicSystemStatus } from '../services/adminApi';

const DEFAULT_STATUS = {
  maintenanceMode: false,
  publicAnnouncements: true,
  maintenanceMessage: 'Hệ thống đang bảo trì định kỳ. Vui lòng quay lại sau.',
};

const useSystemMaintenanceStatus = (pollMs = 60000) => {
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

  return { status, loading, refresh };
};

export default useSystemMaintenanceStatus;
