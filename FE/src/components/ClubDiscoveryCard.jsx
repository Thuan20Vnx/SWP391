import React from 'react';
import { getCategoryColor } from '../data/clubDiscoveryData';

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const formatFollowerCount = (count) => {
  const n = Number(count) || 0;
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
};

const ClubDiscoveryCard = ({ club, onExplore, layout = 'grid', exploreLabel = 'Khám phá ngay' }) => {
  const categoryColor = getCategoryColor(club.category);
  const { featuredEvent } = club;

  return (
    <article className={`club-discovery-card club-discovery-card--${layout}`}>
      <div className="club-discovery-card__cover-wrap">
        <img src={club.coverImage} alt={club.name} className="club-discovery-card__cover" />
        <span className="club-discovery-card__cover-shade" aria-hidden="true" />
        <span
          className="club-discovery-card__category"
          style={{ backgroundColor: categoryColor }}
        >
          {club.category}
        </span>
        <div
          className="club-discovery-card__logo"
          style={club.logoImage ? undefined : { backgroundColor: club.logoColor }}
          aria-hidden="true"
        >
          {club.logoImage ? (
            <img src={club.logoImage} alt="" className="club-discovery-card__logo-img" />
          ) : (
            <span>{club.logoText}</span>
          )}
        </div>
      </div>

      <div className="club-discovery-card__body">
        <div className="club-discovery-card__header">
          <h3 className="club-discovery-card__name">{club.name}</h3>
          <div className="club-discovery-card__members" title="Người theo dõi / yêu thích">
            <HeartIcon />
            <span>{formatFollowerCount(club.followerCount)} theo dõi</span>
          </div>
        </div>

        <p className="club-discovery-card__desc">{club.description}</p>

        {featuredEvent && (
          <div className="club-discovery-card__featured">
            <span className="club-discovery-card__featured-label">Sự kiện nổi bật</span>
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
          {exploreLabel}
        </button>
      </div>
    </article>
  );
};

export default ClubDiscoveryCard;
