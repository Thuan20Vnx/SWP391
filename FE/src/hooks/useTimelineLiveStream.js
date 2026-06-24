import { useEffect, useRef } from 'react';
import { createNotificationSSE } from '../services/notificationApi';
import { normalizeRole } from '../utils/auth';
import { dispatchTimelineLiveUpdate, shouldDispatchTimelineLive } from '../utils/timelineLiveEvents';

/**
 * Dedicated SSE listener for timeline pages — does not depend on the notification panel being open.
 */
const useTimelineLiveStream = (enabled = true) => {
  const esRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;

    const role = normalizeRole(localStorage.getItem('userRole'));
    if (!shouldDispatchTimelineLive(role)) return undefined;

    const es = createNotificationSSE(
      (payload) => {
        dispatchTimelineLiveUpdate(payload);
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

export default useTimelineLiveStream;
