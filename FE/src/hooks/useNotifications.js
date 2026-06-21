import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchNotifications,
  markNotificationRead as apiMarkRead,
  markAllRead as apiMarkAllRead,
  createNotificationSSE
} from '../services/notificationApi';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const esRef = useRef(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch {
      // silently fail — not logged in or no notifications yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    refetch();

    const es = createNotificationSSE(
      (payload) => {
        setNotifications((prev) => [payload, ...prev]);
      },
      () => {
        // SSE error — will auto-reconnect or silently fail
      }
    );
    esRef.current = es;

    // Fallback for deployments with multiple backend instances where an SSE
    // connection and the request creating a notification may hit different nodes.
    const pollId = window.setInterval(refetch, 20000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [refetch]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = useCallback(async (id) => {
    try {
      await apiMarkRead(id);
      setNotifications((prev) =>
        prev.map((n) => (String(n._id || n.id) === String(id) ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiMarkAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  }, []);

  return { notifications, unreadCount, markRead, markAllRead, refetch, loading };
};

export default useNotifications;
