import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ClubDiscoveryCard from '../components/ClubDiscoveryCard';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import {
  CLUB_SAMPLE_DATA,
  HERO_TAGS,
  filterClubsBySearch,
  filterClubsByTag,
} from '../data/clubDiscoveryData';

const PAGE_SIZE = 3;
const TOTAL_CLUBS = 52;
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80';

const Clubs = ({ showToast }) => {
  const navigate = useNavigate();
  const [clubs] = useState(CLUB_SAMPLE_DATA);
  const [heroSearch, setHeroSearch] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [layout, setLayout] = useState('grid');

  const searchQuery = headerSearch || heroSearch;

  const filteredClubs = useMemo(() => {
    let result = filterClubsByTag(clubs, activeTag);
    result = filterClubsBySearch(result, searchQuery);
    return result;
  }, [clubs, searchQuery, activeTag]);

  const visibleClubs = filteredClubs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredClubs.length;
  const displayTotal = searchQuery || activeTag ? filteredClubs.length : TOTAL_CLUBS;

  const handleHeroSearch = (e) => {
    e.preventDefault();
    setHeaderSearch(heroSearch);
    setVisibleCount(PAGE_SIZE);
  };

  const handleTagClick = (tag) => {
    setActiveTag((prev) => (prev === tag ? '' : tag));
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
    <div className="clubs-page home-layout">
      <SiteHeader
        activeNav="clubs"
        searchPlaceholder="Tìm kiếm câu lạc bộ..."
        searchValue={headerSearch}
        onSearchChange={handleHeaderSearchChange}
      />

      <main className="clubs-page__main">
        <section className="clubs-page__hero">
          <div className="clubs-page__hero-content">
            <h1>
              Kết nối đam mê,
              <span className="clubs-page__hero-accent">Khám phá tiềm</span>
              <span className="clubs-page__hero-accent">năng.</span>
            </h1>
            <p>
              Khám phá cộng đồng sinh viên năng động tại FPT University. Tìm kiếm câu lạc bộ
              phù hợp với sở thích và phát triển kỹ năng mềm vượt trội.
            </p>

            <form className="clubs-page__hero-search" onSubmit={handleHeroSearch}>
              <div className="clubs-page__hero-search-field">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
                </svg>
                <input
                  type="text"
                  placeholder="Nhập tên CLB hoặc lĩnh vực..."
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="clubs-page__hero-search-btn">Tìm ngay</button>
            </form>

            <div className="clubs-page__hero-tags">
              {HERO_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`clubs-page__hero-tag ${activeTag === tag ? 'is-active' : ''}`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="clubs-page__hero-visual">
            <img src={HERO_IMAGE} alt="Hoạt động câu lạc bộ sinh viên" className="clubs-page__hero-img" />
            <div className="clubs-page__hero-stat">
              <div className="clubs-page__hero-stat-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#f26f21">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <div>
                <strong>50+</strong>
                <span>Câu lạc bộ đang hoạt động</span>
              </div>
            </div>
          </div>
        </section>

        <section className="clubs-page__community">
          <div className="clubs-page__community-head">
            <div>
              <h2>Khám phá Cộng đồng</h2>
              <p>Dành riêng cho tinh thần nhiệt huyết của sinh viên FPT</p>
            </div>
            <div className="clubs-page__view-toggle" role="group" aria-label="Chế độ hiển thị">
              <button
                type="button"
                className={layout === 'grid' ? 'is-active' : ''}
                onClick={() => setLayout('grid')}
                aria-label="Lưới"
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
                aria-label="Danh sách"
              >
                <svg viewBox="0 0 18 10" width="18" height="10" fill="currentColor">
                  <rect x="0" y="0" width="18" height="2" rx="1" />
                  <rect x="0" y="4" width="18" height="2" rx="1" />
                  <rect x="0" y="8" width="18" height="2" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {visibleClubs.length === 0 ? (
            <div className="clubs-page__empty">
              <p>Không tìm thấy câu lạc bộ phù hợp.</p>
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
                Xóa bộ lọc
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
                Xem thêm câu lạc bộ
                <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
                  <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>
              <p className="clubs-page__load-more-meta">
                Hiển thị {Math.min(visibleCount, filteredClubs.length)} trên {displayTotal} câu lạc bộ
              </p>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />

      <button
        type="button"
        className="clubs-page__fab"
        aria-label="Bạn cần giúp gì?"
        onClick={() => navigate('/support')}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
        </svg>
        Bạn cần giúp gì?
      </button>
    </div>
  );
};

export default Clubs;
