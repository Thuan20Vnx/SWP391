import React from 'react';
import { Link } from 'react-router-dom';
import { getCategoryColor, getFillPercent } from '../data/eventDiscoveryData';
import { prefetchPublicEventById } from '../services/eventsApi';
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

const EventDiscoveryCard = ({
  event,
  onDetail,
  onPrimaryAction,
  onManage,
  manageLabel = 'Quản lý',
  manageHint = '',
  viewOnly = false,
}) => {
  const {
    title,
    thumbnail,
    category,
    categoryLabel,
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
    organizerLabel,
  } = event;

  const fillPercent = getFillPercent(filledSlots, totalSlots);
  const categoryColor = getCategoryColor(category);
  const isExpired = cardState === 'expired';
  const isPostponed = cardState === 'postponed';
  const isRegistered = cardState === 'registered' || registered;
  const showProgress = !isPostponed;
  const hasManageAction = viewOnly && typeof onManage === 'function';
  const singleAction = isPostponed || (viewOnly && !hasManageAction);
  const detailPath = event?.id ? `/events/${event.id}` : null;
  // Khi consumer cung cấp onPrimaryAction (vd: ICPDP/CTSV điều hướng tới trang
  // chi tiết riêng), dùng callback đó thay vì link công khai /events/:id.
  const usesCustomDetail = viewOnly && !hasManageAction && typeof onPrimaryAction === 'function';
  const prefetchDetail = () => {
    if (event?.id) prefetchPublicEventById(event.id);
  };

  return (    <article
      className={`event-discovery-card event-discovery-card--${cardState}`}
      data-state={cardState}
      onMouseEnter={prefetchDetail}
    >
      <div className="event-discovery-card__media">
        <img src={thumbnail} alt={title} className="event-discovery-card__img" />
        {isExpired && <div className="event-discovery-card__desaturate" aria-hidden="true" />}

        <span
          className="event-discovery-card__category"
          style={{ backgroundColor: isExpired ? '#4b5563' : categoryColor }}
        >
          {categoryLabel || category}
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
        <div className="event-discovery-card__body-main">
          <div className="event-discovery-card__head">
            {usesCustomDetail ? (
              <button
                type="button"
                className="event-discovery-card__title-link"
                onClick={() => onPrimaryAction?.(event)}
              >
                <h3 className="event-discovery-card__title">{title}</h3>
              </button>
            ) : detailPath ? (
              <Link
                to={detailPath}
                className="event-discovery-card__title-link"
                onFocus={prefetchDetail}
              >
                <h3 className="event-discovery-card__title">{title}</h3>
              </Link>
            ) : (
              <h3 className="event-discovery-card__title">{title}</h3>
            )}            {organizerLabel && (
              <span className="event-discovery-card__organizer">{organizerLabel}</span>
            )}
          </div>

          <div className="event-discovery-card__meta">
            <div className="event-discovery-card__meta-chip">
              <span className="event-discovery-card__meta-icon" aria-hidden="true">
                <CalendarIcon />
              </span>
              <span className="event-discovery-card__meta-text">{dateLabel}</span>
            </div>
            <div className="event-discovery-card__meta-chip">
              <span className="event-discovery-card__meta-icon" aria-hidden="true">
                <LocationIcon />
              </span>
              <span className="event-discovery-card__meta-text event-discovery-card__location">
                {location}
              </span>
            </div>
          </div>

          {(showProgress || (priceLabel && !isPostponed)) && (
            <div className="event-discovery-card__info-panel">
              {showProgress && (
                <div className="event-discovery-card__progress">
                  <div className="event-discovery-card__progress-labels">
                    <span className="event-discovery-card__progress-slot">
                      <strong>{filledSlots}</strong>/{totalSlots} chỗ
                    </span>
                    <span className={isExpired ? 'is-muted' : 'is-accent'}>{fillPercent}% đã đăng ký</span>
                  </div>
                  <div className="event-discovery-card__progress-track">
                    <div
                      className={`event-discovery-card__progress-fill ${isExpired ? 'is-full' : ''}`}
                      style={{ width: `${Math.max(fillPercent, fillPercent > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              )}

              {priceLabel && !isPostponed && (
                <div className="event-discovery-card__price">
                  <span className="event-discovery-card__price-label">{priceLabel}</span>
                  {studentPrivilegeApplied && (
                    <span className="event-discovery-card__price-badge">Ưu đãi SV</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`event-discovery-card__actions ${singleAction ? 'is-single' : ''}`}>
          {hasManageAction && manageHint ? (
            <p className="event-discovery-card__manage-hint">{manageHint}</p>
          ) : null}
          {!isPostponed && (!viewOnly || hasManageAction) && detailPath && (
            <Link
              to={detailPath}
              className="event-discovery-card__btn event-discovery-card__btn--outline"
              onFocus={prefetchDetail}
            >
              Chi tiết
            </Link>
          )}
          {viewOnly && !hasManageAction && detailPath && !usesCustomDetail ? (
            <Link
              to={detailPath}
              className={`event-discovery-card__btn event-discovery-card__btn--primary ${singleAction ? 'is-full' : ''}`}
              onFocus={prefetchDetail}
            >
              Xem chi tiết
            </Link>
          ) : (
          <button
            type="button"
            className={`event-discovery-card__btn event-discovery-card__btn--primary ${
              hasManageAction ? 'event-discovery-card__btn--manage' : ''
            } ${isExpired && !viewOnly ? 'is-disabled' : ''} ${singleAction ? 'is-full' : ''}`}
            disabled={isExpired && !viewOnly}
            onClick={() => {
              if (hasManageAction) onManage?.(event);
              else onPrimaryAction?.(event);
            }}
          >
            {hasManageAction ? manageLabel : primaryLabel}
          </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default EventDiscoveryCard;
