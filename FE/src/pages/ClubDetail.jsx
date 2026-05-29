import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import ClubUpcomingEventCard from '../components/ClubUpcomingEventCard';
import useUserProfile from '../hooks/useUserProfile';
import { CLUB_SAMPLE_DATA } from '../data/clubDiscoveryData';
import { getClubDetailById } from '../data/clubDetailData';

const RocketIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="#f26f21" aria-hidden="true">
    <path d="M12 2.5c-2.5 2.1-4 5.2-4 8.7 0 .8.1 1.6.3 2.3L5 16.5V19l2.5-.5 2.8-2.8c.7.2 1.5.3 2.3.3 3.5 0 6.6-1.5 8.7-4-2.1-2.5-5.2-4-8.7-4-.8 0-1.6.1-2.3.3L9.5 5 9 2.5h3zM7.5 17.5l1.2 1.2-1.5.3.3-1.5zM14 8a2 2 0 110 4 2 2 0 010-4z" />
  </svg>
);

const CommunityIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="#f26f21" aria-hidden="true">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);

const HIGHLIGHT_ICONS = {
  rocket: RocketIcon,
  community: CommunityIcon,
};

const ClubDetail = ({ showToast }) => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [headerSearch, setHeaderSearch] = useState('');
  const [following, setFollowing] = useState(false);
  const [joined, setJoined] = useState(false);
  const { isLoggedIn } = useUserProfile();

  const club = getClubDetailById(clubId, CLUB_SAMPLE_DATA);

  if (!club) {
    return (
      <div className="club-detail-page home-layout">
        <SiteHeader activeNav="clubs" searchPlaceholder="Tìm kiếm câu lạc bộ..." />
        <main className="club-detail-page__not-found">
          <h1>Không tìm thấy câu lạc bộ</h1>
          <Link to="/clubs" className="club-detail-page__back-link">← Quay lại danh sách CLB</Link>
        </main>
      </div>
    );
  }

  const handleFollow = () => {
    setFollowing((prev) => !prev);
    showToast?.(following ? 'Đã bỏ theo dõi CLB.' : 'Đã theo dõi CLB!', 'success');
  };

  const handleJoin = () => {
    if (!isLoggedIn) {
      showToast?.('Vui lòng đăng nhập để tham gia CLB!', 'error');
      setTimeout(() => navigate('/login'), 1200);
      return;
    }
    setJoined(true);
    showToast?.('Đã gửi yêu cầu tham gia CLB!', 'success');
  };

  const handleEventAction = (event) => {
    showToast?.(`${event.primaryLabel}: ${event.title}`, 'success');
  };

  return (
    <div className="club-detail-page home-layout">
      <SiteHeader
        activeNav="clubs"
        searchPlaceholder="Tìm kiếm câu lạc bộ..."
        searchValue={headerSearch}
        onSearchChange={setHeaderSearch}
      />

      <section className="club-detail-page__hero">
        <div className="club-detail-page__banner">
          <img src={club.bannerImage} alt="" className="club-detail-page__banner-img" />
        </div>
        <div className="club-detail-page__identity">
          <div className="club-detail-page__logo-wrap">
            {club.logoImage ? (
              <img src={club.logoImage} alt={club.name} className="club-detail-page__logo-img" />
            ) : (
              <div
                className="club-detail-page__logo-fallback"
                style={{ backgroundColor: club.logoColor }}
              >
                {club.logoText}
              </div>
            )}
          </div>
          <div className="club-detail-page__identity-main">
            <div className="club-detail-page__title-row">
              <div>
                <h1>{club.name}</h1>
                <p className="club-detail-page__org">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  {club.organization}
                </p>
              </div>
              <div className="club-detail-page__actions">
                <button
                  type="button"
                  className={`club-detail-page__btn club-detail-page__btn--outline ${following ? 'is-active' : ''}`}
                  onClick={handleFollow}
                >
                  {following ? 'Đang theo dõi' : 'Theo dõi'}
                </button>
                <button
                  type="button"
                  className="club-detail-page__btn club-detail-page__btn--primary"
                  onClick={handleJoin}
                  disabled={joined}
                >
                  {joined ? 'Đã gửi yêu cầu' : 'Tham gia ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="club-detail-page__main">
        <div className="club-detail-page__layout">
          <div className="club-detail-page__content">
            <section className="club-detail-page__section">
              <h2>Giới thiệu CLB</h2>
              {club.about.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
              <div className="club-detail-page__highlights">
                {club.highlights.map((item) => {
                  const Icon = HIGHLIGHT_ICONS[item.icon] || RocketIcon;
                  return (
                    <div key={item.title} className="club-detail-page__highlight-card">
                      <Icon />
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="club-detail-page__section">
              <h2>Ban chủ nhiệm</h2>
              <div className="club-detail-page__board">
                {club.board.map((member) => (
                  <div key={member.name} className="club-detail-page__board-member">
                    <img src={member.avatar} alt={member.name} />
                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="club-detail-page__sidebar">
            <div className="club-detail-page__quick-info">
              <h3>Thông tin nhanh</h3>
              <ul>
                <li>
                  <span className="club-detail-page__quick-icon">👥</span>
                  <div>
                    <small>Thành viên</small>
                    <strong>{club.memberCount}+ thành viên</strong>
                  </div>
                </li>
                <li>
                  <span className="club-detail-page__quick-icon">📅</span>
                  <div>
                    <small>Sự kiện đã tổ chức</small>
                    <strong>{club.eventsHeld} sự kiện</strong>
                  </div>
                </li>
                <li>
                  <span className="club-detail-page__quick-icon">🕐</span>
                  <div>
                    <small>Thành lập</small>
                    <strong>{club.founded}</strong>
                  </div>
                </li>
              </ul>
              <div className="club-detail-page__links">
                <h4>Liên kết</h4>
                <div className="club-detail-page__links-row">
                  {club.links.map((link) => (
                    <button
                      key={link.type}
                      type="button"
                      className="club-detail-page__link-btn"
                      aria-label={link.label}
                      onClick={() => showToast?.(`Liên kết ${link.label} đang phát triển.`, 'success')}
                    >
                      {link.type === 'website' && '🌐'}
                      {link.type === 'share' && '↗'}
                      {link.type === 'email' && '✉️'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>

        {club.upcomingEvents.length > 0 && (
          <section className="club-detail-page__events">
            <div className="club-detail-page__events-head">
              <h2>Sự kiện sắp tới</h2>
              <Link to="/events" className="club-detail-page__view-all">
                Xem tất cả
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </Link>
            </div>
            <div className="club-detail-page__events-grid">
              {club.upcomingEvents.map((event) => (
                <ClubUpcomingEventCard
                  key={event.id}
                  event={event}
                  onAction={handleEventAction}
                />
              ))}
            </div>
          </section>
        )}
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

export default ClubDetail;
