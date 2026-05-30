import { useEffect, useMemo, useState } from 'react';
import { buildLiveDashboardData } from '../data/adminDashboardLive';

/** Làm mới dữ liệu dashboard theo thời gian thực (mặc định mỗi giây). */
export function useAdminDashboardLiveData(tickMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return useMemo(() => buildLiveDashboardData(now), [now.getTime()]);
}

export default useAdminDashboardLiveData;
