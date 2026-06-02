import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const QrPlaceholder = ({ code }) => (
  <div className="event-ticket-modal__qr" aria-hidden="true">
    <svg viewBox="0 0 120 120" className="event-ticket-modal__qr-svg">
      {Array.from({ length: 12 }, (_, row) =>
        Array.from({ length: 12 }, (__, col) => {
          const seed = (code.charCodeAt((row + col) % code.length) + row * col) % 3;
          if (seed === 0) return null;
          return (
            <rect
              key={`${row}-${col}`}
              x={col * 10}
              y={row * 10}
              width="8"
              height="8"
              fill="currentColor"
            />
          );
        })
      )}
    </svg>
  </div>
);

const EventTicketModal = ({ open, ticket, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !ticket) return null;

  return createPortal(
    <div className="event-ticket-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="event-ticket-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-ticket-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="event-ticket-modal__close" onClick={onClose} aria-label="Đóng">
          ×
        </button>

        <div className="event-ticket-modal__header">
          <span className="event-ticket-modal__badge">Vé điện tử</span>
          <h2 id="event-ticket-title">{ticket.title}</h2>
        </div>

        {ticket.thumbnail ? (
          <img src={ticket.thumbnail} alt="" className="event-ticket-modal__thumb" />
        ) : null}

        <div className="event-ticket-modal__body">
          <div className="event-ticket-modal__row">
            <span>Ngày</span>
            <strong>{ticket.dateLabel}{ticket.timeRange ? ` · ${ticket.timeRange}` : ''}</strong>
          </div>
          <div className="event-ticket-modal__row">
            <span>Địa điểm</span>
            <strong>{ticket.location}</strong>
          </div>
          <div className="event-ticket-modal__row">
            <span>Người tham dự</span>
            <strong>{ticket.holderName || '—'}</strong>
          </div>
          <div className="event-ticket-modal__row">
            <span>Loại vé</span>
            <strong>{ticket.priceLabel}</strong>
          </div>
        </div>

        <div className="event-ticket-modal__footer">
          <QrPlaceholder code={ticket.ticketCode} />
          <div className="event-ticket-modal__code-block">
            <span>Mã vé</span>
            <strong className="event-ticket-modal__code">{ticket.ticketCode}</strong>
            <p>Trình mã này tại cửa check-in sự kiện</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EventTicketModal;
