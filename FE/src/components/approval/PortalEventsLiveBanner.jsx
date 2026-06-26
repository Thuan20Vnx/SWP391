import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAdminEventsLiveStream from '../../hooks/useAdminEventsLiveStream';
import { PORTAL_EVENTS_LIVE_EVENT } from '../../utils/adminEventsLiveEvents';

const PortalEventsLiveBanner = ({ active = true }) => {
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);

  useAdminEventsLiveStream(active);

  useEffect(() => {
    if (!active) {
      setNotice(null);
      return undefined;
    }

    const onLive = (event) => {
      const payload = event.detail;
      if (!payload) return;
      setNotice({
        title: payload.title || 'Danh sách duyệt có thay đổi',
        body: payload.body || 'Có đề xuất hoặc sự kiện mới cần xem.',
      });
    };

    window.addEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
    return () => window.removeEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
  }, [active]);

  const handleReload = useCallback(() => {
    const payload = notice;
    setNotice(null);
    if (payload) {
      window.dispatchEvent(new CustomEvent(PORTAL_EVENTS_LIVE_EVENT, { detail: payload }));
    } else {
      navigate(0);
    }
  }, [navigate, notice]);

  if (!active || !notice) return null;

  return (
    <div className="portal-timeline-live-banner" role="alert" aria-live="assertive">
      <div className="portal-timeline-live-banner__text">
        <strong>{notice.title}</strong>
        <span>{notice.body}</span>
      </div>
      <div className="portal-timeline-live-banner__actions">
        <button type="button" className="portal-timeline-live-banner__reload" onClick={handleReload}>
          Cập nhật ngay
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

export default PortalEventsLiveBanner;
