import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchNotifications,
  markNotificationRead as apiMarkRead,
  markAllRead as apiMarkAllRead,
  createNotificationSSE
} from '../services/notificationApi';
import { normalizeRole } from '../utils/auth';
import { dispatchTimelineLiveUpdate, shouldDispatchTimelineLive } from '../utils/timelineLiveEvents';
import { dispatchPortalEventsLiveUpdate, shouldDispatchPortalEventsLive } from '../utils/adminEventsLiveEvents';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const esRef = useRef(null);
  const mergeNotifications = useCallback((incoming) => {
    setNotifications((prev) => {
      const map = new Map();
      [...incoming, ...prev].forEach((item) => {
        const key = String(item?._id || item?.id || '');
        if (!key) return;
        if (!map.has(key)) map.set(key, item);
      });
      return [...map.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    });
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(Array.isArray(data) ? data : []);
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
        mergeNotifications([payload]);
        const role = normalizeRole(localStorage.getItem('userRole'));
        if (shouldDispatchTimelineLive(role)) {
          dispatchTimelineLiveUpdate(payload);
        }
        if (shouldDispatchPortalEventsLive(role)) {
          dispatchPortalEventsLiveUpdate(payload);
        }
        refetch();
      },
      () => {
        refetch();
      }
    );
    esRef.current = es;

    // Safari/iPad and multi-instance deploys can miss live SSE pushes, so keep
    // a lightweight visible-tab poll running as a near-real-time fallback.
    const poll = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    const pollId = window.setInterval(poll, 5000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    const handleFocus = () => refetch();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [mergeNotifications, refetch]);

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
