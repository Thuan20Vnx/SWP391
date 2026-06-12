import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ClubDiscoveryCard from '../components/ClubDiscoveryCard';
import PublicAdminShell from '../layouts/PublicAdminShell';
import SiteFooter from '../components/SiteFooter';
import { API_BASE, getAuthHeaders } from '../utils/api';
import {
  CLUB_SAMPLE_DATA,
  HERO_TAGS,
  filterClubsBySearch,
  filterClubsByTag,
  mapApiClubToListItem,
} from '../data/clubDiscoveryData';
import { useTranslation } from '../i18n/I18nContext';

const PAGE_SIZE = 3;
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80';

const Clubs = ({ showToast }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [clubs, setClubs] = useState([]);
  const [totalClubs, setTotalClubs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [layout, setLayout] = useState('grid');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/clubs`, { headers: getAuthHeaders(false) })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.clubs?.length > 0) {
          setClubs(data.clubs.map(mapApiClubToListItem));
          setTotalClubs(data.total ?? data.clubs.length);
        } else {
          setClubs(CLUB_SAMPLE_DATA);
          setTotalClubs(CLUB_SAMPLE_DATA.length);
        }
      })
      .catch(() => {
        setClubs(CLUB_SAMPLE_DATA);
        setTotalClubs(CLUB_SAMPLE_DATA.length);
        showToast?.(t('clubs.loadFail'), 'error');
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const searchQuery = headerSearch || heroSearch;

  const filteredClubs = useMemo(() => {
    let result = filterClubsByTag(clubs, activeTag);
    result = filterClubsBySearch(result, searchQuery);
    return result;
  }, [clubs, searchQuery, activeTag]);

  const visibleClubs = filteredClubs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredClubs.length;
  const displayTotal = searchQuery || activeTag ? filteredClubs.length : totalClubs;

  const handleHeroSearch = (e) => {
    e.preventDefault();
    setHeaderSearch(heroSearch);
    setVisibleCount(PAGE_SIZE);
  };

  const handleTagClick = (tagId) => {
    setActiveTag((prev) => (prev === tagId ? '' : tagId));
    setVisibleCount(PAGE_SIZE);
  };

  const handleHeaderSearchChange = (value) => {
    setHeaderSearch(value);
    setVisibleCount(PAGE_SIZE);
  };

  const handleExplore = (club) => {
    navigate(`/clubs/${club.id}`);
  };

  return (
    <PublicAdminShell
      activeNav="clubs"
      searchPlaceholder={t('header.searchClubs')}
      searchValue={headerSearch}
      onSearchChange={handleHeaderSearchChange}
    >
    <div className="clubs-page home-layout">
      <main className="clubs-page__main">
        <section className="clubs-page__hero">
          <div className="clubs-page__hero-content">
            <h1>
              {t('clubs.heroTitle1')}
              <span className="clubs-page__hero-accent">{t('clubs.heroTitle2')}</span>
              <span className="clubs-page__hero-accent">{t('clubs.heroTitle3')}</span>
            </h1>
            <p>{t('clubs.heroDesc')}</p>

            <form className="clubs-page__hero-search" onSubmit={handleHeroSearch}>
              <div className="clubs-page__hero-search-field">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
                </svg>
                <input
                  type="text"
                  placeholder={t('clubs.searchPlaceholder')}
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="clubs-page__hero-search-btn">{t('clubs.searchBtn')}</button>
            </form>

            <div className="clubs-page__hero-tags">
              {HERO_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`clubs-page__hero-tag ${activeTag === tag.id ? 'is-active' : ''}`}
                  onClick={() => handleTagClick(tag.id)}
                >
                  {t(tag.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="clubs-page__hero-visual">
            <img src={HERO_IMAGE} alt={t('clubs.heroImageAlt')} className="clubs-page__hero-img" />
            <div className="clubs-page__hero-stat">
              <div className="clubs-page__hero-stat-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#f26f21">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <div>
                <strong>50+</strong>
                <span>{t('clubs.stat')}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="clubs-page__community">
          <div className="clubs-page__community-head">
            <div>
              <h2>{t('clubs.communityTitle')}</h2>
              <p>{t('clubs.communityDesc')}</p>
            </div>
            <div className="clubs-page__view-toggle" role="group" aria-label={t('clubs.viewMode')}>
              <button
                type="button"
                className={layout === 'grid' ? 'is-active' : ''}
                onClick={() => setLayout('grid')}
                aria-label={t('clubs.viewGrid')}
              >
                <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
                  <rect x="0" y="0" width="7" height="7" rx="1" />
                  <rect x="11" y="0" width="7" height="7" rx="1" />
                  <rect x="0" y="11" width="7" height="7" rx="1" />
                  <rect x="11" y="11" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                className={layout === 'list' ? 'is-active' : ''}
                onClick={() => setLayout('list')}
                aria-label={t('clubs.viewList')}
              >
                <svg viewBox="0 0 18 10" width="18" height="10" fill="currentColor">
                  <rect x="0" y="0" width="18" height="2" rx="1" />
                  <rect x="0" y="4" width="18" height="2" rx="1" />
                  <rect x="0" y="8" width="18" height="2" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="clubs-page__empty">
              <p>{t('clubs.loading')}</p>
            </div>
          ) : visibleClubs.length === 0 ? (
            <div className="clubs-page__empty">
              <p>{t('clubs.empty')}</p>
              <button
                type="button"
                className="clubs-page__reset-btn"
                onClick={() => {
                  setHeroSearch('');
                  setHeaderSearch('');
                  setActiveTag('');
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                {t('clubs.reset')}
              </button>
            </div>
          ) : (
            <div className={`clubs-page__grid clubs-page__grid--${layout}`}>
              {visibleClubs.map((club) => (
                <ClubDiscoveryCard
                  key={club.id}
                  club={club}
                  layout={layout}
                  onExplore={handleExplore}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="clubs-page__load-more-wrap">
              <button
                type="button"
                className="clubs-page__load-more"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                {t('clubs.loadMore')}
                <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
                  <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>
              <p className="clubs-page__load-more-meta">
                {t('clubs.loadMoreMeta', {
                  shown: Math.min(visibleCount, filteredClubs.length),
                  total: displayTotal,
                })}
              </p>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />

      <button
        type="button"
        className="clubs-page__fab"
        aria-label={t('clubs.fabLabel')}
        onClick={() => navigate('/support')}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
        </svg>
        {t('clubs.fabText')}
      </button>
    </div>
    </PublicAdminShell>
  );
};

export default Clubs;
