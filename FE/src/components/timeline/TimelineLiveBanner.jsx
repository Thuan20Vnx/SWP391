import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIMELINE_LIVE_EVENT } from '../../utils/timelineLiveEvents';

const TimelineLiveBanner = ({ active = true }) => {
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!active) {
      setNotice(null);
      return undefined;
    }

    const onLive = (event) => {
      const payload = event.detail;
      if (!payload) return;
      setNotice({
        title: payload.title || 'Timeline có thay đổi',
        body: payload.body || 'Dữ liệu có thể đã cập nhật.',
      });
    };

    window.addEventListener(TIMELINE_LIVE_EVENT, onLive);
    return () => window.removeEventListener(TIMELINE_LIVE_EVENT, onLive);
  }, [active]);

  const handleReload = useCallback(() => {
    setNotice(null);
    navigate(0);
  }, [navigate]);

  if (!active || !notice) return null;

  return (
    <div className="portal-timeline-live-banner" role="alert" aria-live="assertive">
      <div className="portal-timeline-live-banner__text">
        <strong>{notice.title}</strong>
        <span>{notice.body}</span>
      </div>
      <div className="portal-timeline-live-banner__actions">
        <button type="button" className="portal-timeline-live-banner__reload" onClick={handleReload}>
          Tải lại trang
        </button>
        <button
          type="button"
          className="portal-timeline-live-banner__dismiss"
          onClick={() => setNotice(null)}
          aria-label="Đóng thông báo"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default TimelineLiveBanner;
