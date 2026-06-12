import React from 'react';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';
import { CLUB_NAV_ITEMS, isClubNavActive } from './clubNavConfig';

const ClubSidebarNav = ({ activeNav, onNavSelect, hasNewNotifs = false }) => {
  const items = [];
  let lastSection = null;

  CLUB_NAV_ITEMS.forEach((item) => {
    if (item.section && item.section !== lastSection) {
      lastSection = item.section;
      items.push(
        <p key={`sec-${item.section}`} className="ctsv-nav-section">
          {item.section}
        </p>
      );
    }

    const linkClass = isClubNavActive(item.key, activeNav)
      ? 'ctsv-nav-link active'
      : 'ctsv-nav-link';

    items.push(
      <button
        key={item.key}
        type="button"
        className={linkClass}
        onClick={() => onNavSelect(item.key)}
      >
        <span className="ctsv-nav-icon">
          <CtsvNavIcon type={item.icon} />
        </span>
        <span className="ctsv-nav-label">
          <span className="ctsv-nav-label__full">
            {item.label}
            {item.key === 'notifications' && hasNewNotifs && (
              <span className="club-nav-unread-dot" aria-hidden="true" />
            )}
          </span>
          <span className="ctsv-nav-label__short">
            {item.mobileLabel || item.label}
            {item.key === 'notifications' && hasNewNotifs && (
              <span className="club-nav-unread-dot" aria-hidden="true" />
            )}
          </span>
        </span>
      </button>
    );
  });

  return <nav className="ctsv-sidebar-nav">{items}</nav>;
};

export default ClubSidebarNav;
