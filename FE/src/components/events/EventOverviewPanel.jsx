import React from 'react';
import { audienceLabel, formatTicketPriceLabel } from '../../utils/eventTicketTypes';
import { getTicketFillPct, mapTicketTypesWithProgress } from '../../utils/ticketRegistrationStats';
import EventPlanFilePanel from './EventPlanFilePanel';

const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

const formatDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString('vi-VN'),
    time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  };
};

const ScheduleBlock = ({ label, start, end }) => {
  const startDt = formatDateTime(start);
  const endDt = formatDateTime(end);
  if (!startDt && !endDt) {
    return (
      <div className="ev-overview-schedule">
        <span className="ev-overview-schedule__label">{label}</span>
        <span className="ev-overview-schedule__empty">Chưa cập nhật</span>
      </div>
    );
  }
  return (
    <div className="ev-overview-schedule">
      <span className="ev-overview-schedule__label">{label}</span>
      <div className="ev-overview-schedule__rows">
        {startDt && (
          <div className="ev-overview-schedule__row">
            <span className="ev-overview-schedule__tag">Bắt đầu</span>
            <span className="ev-overview-schedule__value">
              {startDt.time} · {startDt.date}
            </span>
          </div>
        )}
        {endDt && (
          <div className="ev-overview-schedule__row">
            <span className="ev-overview-schedule__tag">Kết thúc</span>
            <span className="ev-overview-schedule__value">
              {endDt.time} · {endDt.date}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoChip = ({ label, value, highlight }) => (
  <div className={`ev-overview-chip${highlight ? ' ev-overview-chip--highlight' : ''}`}>
    <span className="ev-overview-chip__label">{label}</span>
    <span className="ev-overview-chip__value">{value}</span>
  </div>
);

const EventOverviewPanel = ({ event }) => {
  if (!event) {
    return <p className="ev-panel-empty">Đang tải thông tin sự kiện…</p>;
  }

  const bannerSrc = event.thumbnail || event.image || DEFAULT_BANNER;
  const formatLabel =
    event.format === 'online' ? 'Trực tuyến' : event.format === 'hybrid' ? 'Kết hợp' : 'Tại trường';
  const registered = event.registeredCount || 0;
  const capacity = event.capacity || event.totalTickets || 0;
  const fillPct = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
  const ticketsWithProgress = mapTicketTypesWithProgress(event.ticketTypes, registered);

  return (
    <div className="ev-overview-panel">
      <div className="ev-overview-hero">
        <div className="ev-overview-banner">
          <img src={bannerSrc} alt={`Banner sự kiện ${event.title || ''}`} />
          <div className="ev-overview-banner__shade" aria-hidden />
        </div>
        <div className="ev-overview-hero__content">
          {event.category && <span className="ev-overview-category">{event.category}</span>}
          <h2 className="ev-overview-event-name">{event.title || 'Sự kiện'}</h2>
          {event.speaker && (
            <p className="ev-overview-speaker">
              <span className="ev-overview-speaker__icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </span>
              {event.speaker}
            </p>
          )}
          <div className="ev-overview-hero__meta">
            {event.location && (
              <span className="ev-overview-meta-pill">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                {event.location}
              </span>
            )}
            <span className="ev-overview-meta-pill">{formatLabel}</span>
          </div>
        </div>
      </div>

      <div className="ev-overview-body">
        <section className="ev-overview-section ev-overview-section--stats">
          <div className="ev-overview-stats">
            <div className="ev-overview-stat-card">
              <span className="ev-overview-stat-card__label">Đăng ký</span>
              <span className="ev-overview-stat-card__value">
                {registered}
                <span className="ev-overview-stat-card__unit">/ {capacity} vé</span>
              </span>
              <div className="ev-overview-stat-card__bar">
                <div className="ev-overview-stat-card__fill" style={{ width: `${fillPct}%` }} />
              </div>
            </div>
            <InfoChip
              label="Giá từ"
              value={
                event.ticketPrice > 0
                  ? `${Number(event.ticketPrice).toLocaleString('vi-VN')} đ`
                  : 'Miễn phí'
              }
              highlight={!event.ticketPrice}
            />
            <InfoChip label="Hình thức" value={formatLabel} />
          </div>
        </section>

        <section className="ev-overview-section">
          <h3 className="ev-overview-title">Lịch trình</h3>
          <div className="ev-overview-schedule-grid">
            <ScheduleBlock
              label="Đăng ký"
              start={event.registrationStartDate}
              end={event.registrationEndDate}
            />
            <ScheduleBlock label="Sự kiện" start={event.startDate} end={event.endDate} />
          </div>
        </section>

        {ticketsWithProgress.length > 0 && (
          <section className="ev-overview-section">
            <h3 className="ev-overview-title">Loại vé</h3>
            <ul className="ev-overview-tickets">
              {ticketsWithProgress.map((ticket, idx) => {
                const priceAmount =
                  ticket.priceType === 'paid' ? Number(ticket.priceAmount) || 0 : 0;
                const price = formatTicketPriceLabel(priceAmount);
                const isFree = price === 'Miễn phí';
                const qty = ticket.qty || 0;
                const ticketReg = ticket.registeredCount || 0;
                const ticketPct = getTicketFillPct(ticketReg, qty);
                return (
                  <li key={`${ticket.name}-${idx}`} className="ev-overview-ticket">
                    <div className="ev-overview-ticket__main">
                      <span className="ev-overview-ticket__name">{ticket.name || 'Vé'}</span>
                      <span className="ev-overview-ticket__audience">
                        {audienceLabel(ticket.audience)}
                      </span>
                      <div className="ev-overview-ticket__progress">
                        <span className="ev-overview-ticket__progress-nums">
                          {ticketReg}/{qty} đã đăng ký
                        </span>
                        <div className="ev-overview-ticket__progress-bar">
                          <div
                            className="ev-overview-ticket__progress-fill"
                            style={{ width: `${ticketPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="ev-overview-ticket__meta">
                      <span className="ev-overview-ticket__qty">
                        {qty} vé
                      </span>
                      <span className={`ev-overview-ticket__price${isFree ? ' is-free' : ''}`}>
                        {price}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="ev-overview-section">
          <h3 className="ev-overview-title">Mô tả</h3>
          <p className="ev-overview-desc">
            {event.description?.trim() || 'Chưa có mô tả chi tiết.'}
          </p>
          <EventPlanFilePanel
            fileUrl={event.eventPlanFile}
            fileName={event.eventPlanFileName}
            mimeType={event.eventPlanFileMime}
            externalLink={event.eventPlanLink}
          />
        </section>

        {event.agenda?.trim() && (
          <section className="ev-overview-section">
            <h3 className="ev-overview-title">Lịch trình chi tiết (Agenda)</h3>
            <p className="ev-overview-desc ev-overview-desc--pre">{event.agenda}</p>
          </section>
        )}

        {Array.isArray(event.learningOutcomes) && event.learningOutcomes.length > 0 && (
          <section className="ev-overview-section">
            <h3 className="ev-overview-title">Bạn sẽ học được gì</h3>
            <ul className="ev-overview-list">
              {event.learningOutcomes.filter(Boolean).map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default EventOverviewPanel;
