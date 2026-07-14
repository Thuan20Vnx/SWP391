import React, { useEffect } from 'react';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';
import useNavBadges from '../../hooks/useNavBadges';
import { CLUB_NAV_ITEMS, isClubNavActive } from './clubNavConfig';

const ClubSidebarNav = ({ activeNav, onNavSelect, hasNewNotifs = false, embedded = false }) => {
  const { badges, markRead } = useNavBadges();
  const items = [];
  let lastSection = null;

  useEffect(() => {
    const active = CLUB_NAV_ITEMS.find((it) => it.badgeKey && isClubNavActive(it.key, activeNav));
    if (active && badges[active.badgeKey]) markRead(active.badgeKey);
  }, [activeNav, badges, markRead]);

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
    const showBadgeDot =
      (item.badgeKey && badges[item.badgeKey] > 0) ||
      (item.key === 'notifications' && hasNewNotifs);

    items.push(
      <button
        key={item.key}
        type="button"
        className={linkClass}
        onClick={() => {
          if (item.badgeKey) markRead(item.badgeKey);
          onNavSelect(item.key);
        }}
      >
        <span className="ctsv-nav-icon">
          <CtsvNavIcon type={item.icon} />
        </span>
        <span className="ctsv-nav-label">
          <span className="ctsv-nav-label__full">
            {item.labelSub ? (
              <>
                <span>{item.label}</span>
                <span className="ctsv-nav-label__sub">{item.labelSub}</span>
              </>
            ) : (
              item.label
            )}
            {showBadgeDot && (
              <span className="club-nav-unread-dot" aria-hidden="true" />
            )}
          </span>
          <span className="ctsv-nav-label__short">
            {item.mobileLabel || item.labelSub || item.label}
            {showBadgeDot && (
              <span className="club-nav-unread-dot" aria-hidden="true" />
            )}
          </span>
        </span>
      </button>
    );
  });

  if (embedded) return items;

  return <nav className="ctsv-sidebar-nav">{items}</nav>;
};

export default ClubSidebarNav;
