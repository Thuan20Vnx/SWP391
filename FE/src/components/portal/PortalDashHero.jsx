import React from 'react';
import { formatPortalToday, getTimeGreeting } from '../../utils/portalGreeting';

const PortalDashHero = ({
  fullname,
  greeting,
  description,
  eyebrow,
  actions,
  badgeValue,
  badgeLabel,
  aside
}) => {
  const greetingText = greeting ?? getTimeGreeting(fullname);

  return (
    <section className="ctsv-dash-hero">
      <div className="ctsv-dash-hero__head">
        <h1 className="ctsv-dash-hero__greeting">{greetingText}</h1>
        <time className="ctsv-dash-hero__date-right" dateTime={new Date().toISOString().slice(0, 10)}>
          {formatPortalToday()}
        </time>
      </div>

      <div className="ctsv-dash-hero__body">
        <div className="ctsv-dash-hero__content">
          {eyebrow ? <span className="ctsv-dash-hero__eyebrow">{eyebrow}</span> : null}
          {description ? <p className="ctsv-dash-hero__desc">{description}</p> : null}
          {actions ? <div className="ctsv-dash-hero__actions">{actions}</div> : null}
        </div>

        {aside || (badgeValue !== undefined && badgeValue !== null) ? (
          <aside className="ctsv-dash-hero__aside">
            {aside || (
              <div className="ctsv-dash-hero-stat" aria-live="polite">
                <span className="ctsv-dash-hero-stat-num">{badgeValue}</span>
                <span className="ctsv-dash-hero-stat-label">{badgeLabel}</span>
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </section>
  );
};

export default PortalDashHero;
