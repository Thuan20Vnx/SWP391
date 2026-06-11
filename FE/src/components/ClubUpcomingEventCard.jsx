import React from 'react';

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="14" fill="currentColor" aria-hidden="true">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

const ClubUpcomingEventCard = ({ event, onAction }) => {
  const isPrimary = event.variant === 'primary';

  return (
    <article className="club-upcoming-event-card">
      <div className="club-upcoming-event-card__media">
        <img src={event.image} alt={event.title} />
        {event.isHot && <span className="club-upcoming-event-card__hot">Hot Event</span>}
      </div>
      <div className="club-upcoming-event-card__body">
        <div className="club-upcoming-event-card__meta">
          <CalendarIcon />
          <span>{event.date}</span>
          <span className="club-upcoming-event-card__dot">•</span>
          <LocationIcon />
          <span>{event.location}</span>
        </div>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <button
          type="button"
          className={`club-upcoming-event-card__btn ${isPrimary ? 'is-primary' : 'is-outline'}`}
          onClick={() => onAction?.(event)}
        >
          {event.primaryLabel}
        </button>
      </div>
    </article>
  );
};

export default ClubUpcomingEventCard;
