import React from 'react';

const ClubEventListCard = ({
  event,
  statusLabel,
  statusTone,
  onView,
  onDelete,
  showDelete = false,
}) => {
  const startDate = event.startDate
    ? new Date(event.startDate).toLocaleDateString('vi-VN')
    : '--';
  const startTime = event.startDate
    ? new Date(event.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--';
  const reg = event.registeredCount || 0;
  const cap = event.capacity || 0;
  const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;

  return (
    <article className="club-m-event-card">
      <div className="club-m-event-card__head">
        <h3 className="club-m-event-card__title">{event.title}</h3>
        <span className={`clb-table-status clb-table-status--${statusTone}`}>{statusLabel}</span>
      </div>
      <div className="club-m-event-card__meta">
        <span className="clb-table-chip">{event.category || 'Workshop'}</span>
        <span className="club-m-event-card__date">
          {startDate} · {startTime}
        </span>
      </div>
      <div className="clb-slot-cell club-m-event-card__slots">
        <span className="clb-slot-nums">{reg}/{cap} slot</span>
        <div className="clb-slot-bar-bg">
          <div className="clb-slot-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="club-m-event-card__actions">
        <button type="button" className="club-m-btn club-m-btn--primary" onClick={() => onView?.(event._id)}>
          Chi tiết
        </button>
        {showDelete && onDelete && (
          <button type="button" className="club-m-btn club-m-btn--danger" onClick={() => onDelete(event._id)}>
            Xóa
          </button>
        )}
      </div>
    </article>
  );
};

export default ClubEventListCard;
