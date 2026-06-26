import { useEffect, useRef } from 'react';
import { createNotificationSSE } from '../services/notificationApi';
import { normalizeRole } from '../utils/auth';
import { dispatchAdminEventsLiveUpdate, shouldDispatchAdminEventsLive } from '../utils/adminEventsLiveEvents';

/**
 * SSE listener for portal event approval pages — independent of the notification panel.
 */
const useAdminEventsLiveStream = (enabled = true) => {
  const esRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;

    const role = normalizeRole(localStorage.getItem('userRole'));
    if (!shouldDispatchAdminEventsLive(role)) return undefined;

    const es = createNotificationSSE(
      (payload) => {
        dispatchAdminEventsLiveUpdate(payload);
      },
      () => {}
    );
    esRef.current = es;

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [enabled]);
};

export default useAdminEventsLiveStream;
