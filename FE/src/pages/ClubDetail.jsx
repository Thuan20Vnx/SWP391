import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import PublicAdminShell from '../layouts/PublicAdminShell';
import ClubUpcomingEventCard from '../components/ClubUpcomingEventCard';
import useUserProfile from '../hooks/useUserProfile';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { getUserRole, isAdminRole } from '../utils/auth';
import { CLUB_SAMPLE_DATA } from '../data/clubDiscoveryData';
import { getClubDetailById, mapApiClubToDetail, FU_DEVER_DETAIL } from '../data/clubDetailData';
import '../styles/admin-public-pages.css';

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
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const { isLoggedIn, userProfile } = useUserProfile();
  const isAdminViewer = isLoggedIn && isAdminRole(userProfile.role || getUserRole());

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/clubs/${clubId}`, { headers: getAuthHeaders(false) })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.club) {
          const apiClub = data.club;
          const detail = clubId === 'fu-dever'
            ? {
                ...FU_DEVER_DETAIL,
                _id: apiClub._id,
                isFollowing: apiClub.isFollowing,
                membershipStatus: apiClub.membershipStatus || null,
              }
            : mapApiClubToDetail(apiClub);
          setClub(detail);
        } else {
          const fallback = getClubDetailById(clubId, CLUB_SAMPLE_DATA);
          setClub(fallback);
        }
      })
      .catch(() => {
        setClub(getClubDetailById(clubId, CLUB_SAMPLE_DATA));
      })
      .finally(() => setLoading(false));
  }, [clubId, isLoggedIn]);

  if (loading) {
    return (
      <div className="club-detail-page home-layout">
        <SiteHeader activeNav="clubs" searchPlaceholder="Tìm kiếm câu lạc bộ..." />
        <main className="club-detail-page__not-found">
          <p>Đang tải...</p>
        </main>
      </div>
    );
  }

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

  const clubApiId = club._id || clubId;

  const handleFollow = async () => {
    if (!isLoggedIn) {
      showToast?.('Vui lòng đăng nhập để lưu CLB yêu thích!', 'error');
      setTimeout(() => navigate('/login'), 1200);
      return;
    }

    setFollowLoading(true);
    const isFollowing = club.isFollowing;
    const method = isFollowing ? 'DELETE' : 'POST';

    try {
      const res = await fetch(`${API_BASE}/api/clubs/${clubApiId}/follow`, {
        method,
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast?.(data.message || 'Không thể cập nhật CLB yêu thích.', 'error');
        return;
      }

      setClub((prev) => ({ ...prev, isFollowing: !isFollowing }));
      showToast?.(
        data.message || (isFollowing ? 'Đã bỏ khỏi danh sách yêu thích.' : 'Đã thêm vào CLB yêu thích!'),
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast?.('Không thể kết nối máy chủ.', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleEventAction = (event) => {
    if (isAdminViewer && event.id) {
      navigate(`/events/${event.id}`);
      return;
    }
    showToast?.(`${event.primaryLabel}: ${event.title}`, 'success');
  };

  const pageBody = (
    <>
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
                {isAdminViewer ? (
                  <div className="club-detail-page__admin-actions">
                    <button
                      type="button"
                      className="club-detail-page__btn club-detail-page__btn--primary"
                      onClick={() => navigate('/admin/announcements')}
                    >
                      Gửi thông báo
                    </button>
                    <button
                      type="button"
                      className="club-detail-page__btn club-detail-page__btn--outline"
                      onClick={() => navigate('/admin/accounts')}
                    >
                      Quản lý tài khoản
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`club-detail-page__btn club-detail-page__btn--primary ${club.isFollowing ? 'is-active' : ''}`}
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {followLoading
                      ? 'Đang xử lý...'
                      : club.isFollowing
                        ? 'Đã yêu thích'
                        : 'Yêu thích'}
                  </button>
                )}
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
                  <article key={member.name} className="club-detail-page__board-card">
                    <div className="club-detail-page__board-avatar">
                      <img src={member.avatar} alt={member.name} loading="lazy" />
                    </div>
                    <strong className="club-detail-page__board-name">{member.name}</strong>
                    <span className="club-detail-page__board-role">{member.role}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="club-detail-page__section">
              <h2>Sự kiện sắp tới</h2>
              <div className="club-detail-page__events">
                {club.upcomingEvents.map((event) => (
                  <ClubUpcomingEventCard
                    key={event.id}
                    event={event}
                    onAction={handleEventAction}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="club-detail-page__sidebar">
            <div className="club-detail-page__stats-card">
              <div>
                <strong>{club.memberCount}+</strong>
                <span>Thành viên</span>
              </div>
              <div>
                <strong>{club.eventsHeld}</strong>
                <span>Sự kiện đã tổ chức</span>
              </div>
              <div>
                <strong>{club.founded}</strong>
                <span>Thành lập</span>
              </div>
            </div>

            <div className="club-detail-page__links-card">
              <h3>Liên kết</h3>
              {club.links.map((link) => (
                <button
                  key={link.type}
                  type="button"
                  className="club-detail-page__link-btn"
                  onClick={() => showToast?.(`${link.label} (đang phát triển)`, 'info')}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );

  if (isAdminViewer) {
    return (
      <PublicAdminShell
        activeNav="home"
        searchPlaceholder="Tìm CLB, cơ sở, danh mục..."
        searchValue={headerSearch}
        onSearchChange={setHeaderSearch}
      >
        <div className="club-detail-page home-layout">
          <div className="club-detail-page__admin-back">
            <Link to="/">← Quay lại Trang chủ</Link>
          </div>
          {pageBody}
        </div>
      </PublicAdminShell>
    );
  }

  return (
    <div className="club-detail-page home-layout">
      <SiteHeader
        activeNav="clubs"
        searchPlaceholder="Tìm kiếm câu lạc bộ..."
        searchValue={headerSearch}
        onSearchChange={setHeaderSearch}
      />
      {pageBody}
    </div>
  );
};

export default ClubDetail;
