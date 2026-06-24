import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ICPDP_TIMELINE_LIVE_EVENT } from '../../utils/timelineLiveEvents';

const IcpdpTimelineLiveBanner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);

  const isTimelineRoute = location.pathname.includes('/semester-timelines');

  useEffect(() => {
    if (!isTimelineRoute) {
      setNotice(null);
      return undefined;
    }

    const onLive = (event) => {
      const payload = event.detail;
      if (!payload) return;
      setNotice({
        title: payload.title || 'Timeline CLB có thay đổi',
        body: payload.body || 'Danh sách có thể đã thay đổi.',
      });
    };

    window.addEventListener(ICPDP_TIMELINE_LIVE_EVENT, onLive);
    return () => window.removeEventListener(ICPDP_TIMELINE_LIVE_EVENT, onLive);
  }, [isTimelineRoute]);

  const handleReload = useCallback(() => {
    setNotice(null);
    navigate(0);
  }, [navigate]);

  if (!isTimelineRoute || !notice) return null;

  return (
    <div className="icpdp-timeline-live-banner" role="alert" aria-live="assertive">
      <div className="icpdp-timeline-live-banner__text">
        <strong>{notice.title}</strong>
        <span>{notice.body}</span>
      </div>
      <div className="icpdp-timeline-live-banner__actions">
        <button type="button" className="icpdp-timeline-live-banner__reload" onClick={handleReload}>
          Tải lại trang
        </button>
        <button
          type="button"
          className="icpdp-timeline-live-banner__dismiss"
          onClick={() => setNotice(null)}
          aria-label="Đóng thông báo"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default IcpdpTimelineLiveBanner;
