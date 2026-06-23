import React, { useMemo } from 'react';
import { formatMemberCount, getCategoryColor, localizeClubItem } from '../data/clubDiscoveryData';
import { useTranslation } from '../i18n/I18nContext';

const MembersIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);

const ClubDiscoveryCard = ({ club, onExplore, layout = 'grid', exploreLabel }) => {
  const { t } = useTranslation();
  const displayClub = useMemo(() => localizeClubItem(club, t), [club, t]);
  const categoryColor = getCategoryColor(club.category);
  const { featuredEvent } = displayClub;
  const ctaLabel = exploreLabel || t('clubs.explore');

  return (
    <article className={`club-discovery-card club-discovery-card--${layout}`}>
      <div className="club-discovery-card__cover-wrap">
        <img src={displayClub.coverImage} alt={displayClub.name} className="club-discovery-card__cover" />
        <span
          className="club-discovery-card__category"
          style={{ backgroundColor: categoryColor }}
        >
          {displayClub.category}
        </span>
      </div>

      <div className="club-discovery-card__body">
        <div
          className="club-discovery-card__logo"
          style={{ backgroundColor: displayClub.logoColor }}
          aria-hidden="true"
        >
          <span>{displayClub.logoText}</span>
        </div>

        <div className="club-discovery-card__header">
          <h3 className="club-discovery-card__name">{displayClub.name}</h3>
          <div className="club-discovery-card__members">
            <MembersIcon />
            <span>{formatMemberCount(displayClub.memberCount)}</span>
          </div>
        </div>

        <p className="club-discovery-card__desc">{displayClub.description}</p>

        {featuredEvent && (
          <div className="club-discovery-card__featured">
            <span className="club-discovery-card__featured-label">{t('clubs.featuredEvent')}</span>
            <div className="club-discovery-card__featured-row">
              <div className="club-discovery-card__date-box">
                <span className="club-discovery-card__date-month">{featuredEvent.monthShort}</span>
                <span className="club-discovery-card__date-day">{featuredEvent.day}</span>
              </div>
              <p className="club-discovery-card__featured-title">{featuredEvent.title}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          className="club-discovery-card__cta"
          onClick={() => onExplore?.(club)}
        >
          {ctaLabel}
        </button>
      </div>
    </article>
  );
};

export default ClubDiscoveryCard;
