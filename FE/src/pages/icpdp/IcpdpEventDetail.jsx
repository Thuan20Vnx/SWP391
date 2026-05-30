import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { fetchIcpdpEvent } from '../../services/icpdpApi';
import { statusClass } from '../../utils/eventStatus';

const IcpdpEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchIcpdpEvent(id)
      .then((d) => setEvent(d.event))
      .catch(() => {
        showToast?.('Không tải được thông tin sự kiện.', 'error');
        navigate('/icpdp/events');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  if (loading) {
    return (
      <div className="ctsv-page">
        <p className="ctsv-muted">Đang tải...</p>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="ctsv-page">
      <Link to="/icpdp/events" className="ctsv-back-link">
        ← Danh sách sự kiện
      </Link>
      
      <div className="icpdp-view-banner">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p><strong>Chế độ chỉ xem:</strong> IC-PDP giám sát sự kiện toàn trường. Mọi tác vụ quản lý sự kiện (Publish/Hủy) do CTSV đảm nhiệm.</p>
      </div>

      <div className="ctsv-event-header" style={{ marginTop: 20 }}>
        <img src={event.image} alt="" className="ctsv-event-cover" />
        <div className="ctsv-event-title-group">
          <span className={`status-pill ${statusClass(event.status, event.statusKey)}`}>
            {event.status}
          </span>
          <h1>{event.title}</h1>
          <p className="ctsv-muted">
            {event.category} • {event.date} {event.time} • {event.location}
          </p>
        </div>
      </div>

      <div className="ctsv-panel" style={{ marginTop: 20 }}>
        <h3>Chi tiết sự kiện</h3>
        <p>{event.description || 'Không có mô tả.'}</p>
        <p>Nguồn sự kiện: <strong>{event.source === 'school' ? 'Cấp trường' : event.source === 'partner' ? 'Đối tác' : 'Câu lạc bộ'}</strong></p>
        <p>Số vé hiện tại: <strong>{event.remainingTickets} / {event.totalTickets}</strong></p>
      </div>
    </div>
  );
};

export default IcpdpEventDetail;
