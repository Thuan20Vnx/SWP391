import { useEffect, useRef } from 'react';
import { createNotificationSSE } from '../services/notificationApi';
import { dispatchTimelineLiveUpdate } from '../utils/timelineLiveEvents';

/**
 * Dedicated SSE listener for timeline pages — does not depend on the notification panel being open.
 */
const useTimelineLiveStream = (enabled = true) => {
  const esRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;

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
