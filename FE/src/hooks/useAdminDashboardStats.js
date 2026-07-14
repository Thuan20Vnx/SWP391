import { useCallback, useEffect, useState } from 'react';
import { fetchAdminDashboardStats } from '../services/adminApi';

export function useAdminDashboardStats({ months, endYear, endMonth } = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDashboardStats({ months, endYear, endMonth });
      setStats(data.stats || null);
    } catch (err) {
      setError(err.message || 'Không tải được thống kê');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [months, endYear, endMonth]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { stats, loading, error, reload };
}

export default useAdminDashboardStats;
