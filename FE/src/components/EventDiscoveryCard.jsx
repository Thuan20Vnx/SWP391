import React from 'react';
import { getCategoryColor, getFillPercent } from '../data/eventDiscoveryData';

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="14" fill="currentColor" aria-hidden="true">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

const EventDiscoveryCard = ({ event, onDetail, onPrimaryAction }) => {
  const {
    title,
    thumbnail,
    category,
    dateLabel,
    location,
    filledSlots,
    totalSlots,
    cardState,
    postponeReason,
    primaryLabel,
    registered,
    priceLabel,
    studentPrivilegeApplied,
  } = event;

  const fillPercent = getFillPercent(filledSlots, totalSlots);
  const categoryColor = getCategoryColor(category);
  const isExpired = cardState === 'expired';
  const isPostponed = cardState === 'postponed';
  const isRegistered = cardState === 'registered' || registered;
  const showProgress = !isPostponed;

  return (
    <article
      className={`event-discovery-card event-discovery-card--${cardState}`}
      data-state={cardState}
    >
      <div className="event-discovery-card__media">
        <img src={thumbnail} alt={title} className="event-discovery-card__img" />
        {isExpired && <div className="event-discovery-card__desaturate" aria-hidden="true" />}

        <span
          className="event-discovery-card__category"
          style={{ backgroundColor: isExpired ? '#4b5563' : categoryColor }}
        >
          {category.toUpperCase()}
        </span>

        {isRegistered && !isExpired && !isPostponed && (
          <span className="event-discovery-card__registered-badge">Đã đăng ký</span>
        )}

        {isExpired && (
          <div className="event-discovery-card__overlay event-discovery-card__overlay--expired">
            <span className="event-discovery-card__status-pill">Đã kết thúc</span>
          </div>
        )}

        {isPostponed && (
          <div className="event-discovery-card__overlay event-discovery-card__overlay--postponed">
            <span className="event-discovery-card__postponed-badge">Bị hoãn</span>
            {postponeReason && (
              <p className="event-discovery-card__postpone-reason">{postponeReason}</p>
            )}
          </div>
        )}
      </div>

      <div className="event-discovery-card__body">
        <h3 className="event-discovery-card__title">{title}</h3>

        <div className="event-discovery-card__meta">
          <div className="event-discovery-card__meta-row">
            <CalendarIcon />
            <span>{dateLabel}</span>
          </div>
          <div className="event-discovery-card__meta-row">
            <LocationIcon />
            <span className="event-discovery-card__location">{location}</span>
          </div>
        </div>

        {showProgress && (
          <div className="event-discovery-card__progress">
            <div className="event-discovery-card__progress-labels">
              <span>{filledSlots}/{totalSlots} slot</span>
              <span className={isExpired ? 'is-muted' : 'is-accent'}>{fillPercent}%</span>
            </div>
            <div className="event-discovery-card__progress-track">
              <div
                className={`event-discovery-card__progress-fill ${isExpired ? 'is-full' : ''}`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>
        )}

        {priceLabel && !isPostponed && (
          <div className="event-discovery-card__price">
            <span className="event-discovery-card__price-label">{priceLabel}</span>
            {studentPrivilegeApplied && (
              <span className="event-discovery-card__price-badge">Ưu đãi sinh viên</span>
            )}
          </div>
        )}

        <div className={`event-discovery-card__actions ${isPostponed ? 'is-single' : ''}`}>
          {!isPostponed && (
            <button
              type="button"
              className="event-discovery-card__btn event-discovery-card__btn--outline"
              onClick={() => onDetail?.(event)}
            >
              Chi tiết
            </button>
          )}
          <button
            type="button"
            className={`event-discovery-card__btn event-discovery-card__btn--primary ${
              isExpired ? 'is-disabled' : ''
            } ${isPostponed ? 'is-full' : ''}`}
            disabled={isExpired}
            onClick={() => onPrimaryAction?.(event)}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </article>
  );
};

export default EventDiscoveryCard;
