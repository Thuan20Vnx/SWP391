import { useCallback, useEffect, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../utils/api';

/**
 * Chấm đỏ trên sidebar theo nhóm thông báo chưa đọc (events, timeline).
 * - Poll định kỳ + refetch khi cửa sổ được focus.
 * - markRead(category): gọi khi mở trang tương ứng để tắt chấm.
 */
const useNavBadges = () => {
  const [badges, setBadges] = useState({});

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-summary`, {
        headers: getAuthHeaders(false),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setBadges(data.byCategory || {});
    } catch {
      /* im lặng — chấm đỏ không phải chức năng chặn */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const markRead = useCallback((category) => {
    if (!category) return;
    setBadges((prev) => (prev[category] ? { ...prev, [category]: 0 } : prev));
    fetch(`${API_BASE}/api/notifications/read-category`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ category }),
    }).catch(() => {});
  }, []);

  return { badges, refresh, markRead };
};

export default useNavBadges;
