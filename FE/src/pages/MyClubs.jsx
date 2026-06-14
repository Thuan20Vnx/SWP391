import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { getCategoryColor, formatMemberCount } from '../data/clubDiscoveryData';
import { isClubManagerRole } from '../utils/auth';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      fill="currentColor"
    />
  </svg>
);

const MembersIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);

const formatClubDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const MyClubsSkeleton = () => (
  <div className="my-clubs-grid">
    {[1, 2, 3].map((key) => (
      <article key={key} className="my-clubs-card my-clubs-card--skeleton" aria-hidden="true">
        <div className="my-clubs-card__cover shimmer" />
        <div className="my-clubs-card__body">
          <div className="my-clubs-card__logo shimmer" />
          <div className="shimmer my-clubs-skeleton-line my-clubs-skeleton-line--title" />
          <div className="shimmer my-clubs-skeleton-line" />
        </div>
      </article>
    ))}
  </div>
);

const MyClubs = ({ showToast }) => {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    if (isClubManagerRole()) {
      navigate('/quan-ly-clb', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (isClubManagerRole()) return undefined;
    setLoading(true);
    fetch(`${API_BASE}/api/user/my-clubs?tab=following`, { headers: getAuthHeaders(false) })
      .then((res) => {
        if (res.status === 401) {
          navigate('/login');
          return Promise.reject(new Error('Unauthorized'));
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setClubs(data.clubs || []);
        } else {
          setClubs([]);
        }
      })
      .catch((err) => {
        if (err.message !== 'Unauthorized') {
          showToast?.('Không thể tải danh sách CLB yêu thích.', 'error');
        }
        setClubs([]);
      })
      .finally(() => setLoading(false));
  }, [navigate, showToast]);

  const categories = useMemo(
    () => [...new Set(clubs.map((club) => club.category).filter(Boolean))],
    [clubs],
  );

  const filteredClubs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clubs.filter((club) => {
      const matchesCategory = !activeCategory || club.category === activeCategory;
      const matchesSearch =
        !query ||
        club.name.toLowerCase().includes(query) ||
        club.category?.toLowerCase().includes(query) ||
        club.description?.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [clubs, search, activeCategory]);

  const handleRemoveFavorite = async (club) => {
    try {
      const res = await fetch(`${API_BASE}/api/clubs/${club.clubId}/follow`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast?.(data.message || 'Không thể bỏ yêu thích.', 'error');
        return;
      }

      setClubs((prev) => prev.filter((c) => c.id !== club.id));
      showToast?.(data.message || 'Đã bỏ khỏi danh sách yêu thích.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Không thể kết nối máy chủ.', 'error');
    }
  };

  return (
    <StudentDashboardLayout
      activeMenu="my-clubs"
      pageTitle="Câu lạc bộ yêu thích"
      pageSubtitle="Danh sách CLB bạn đã lưu yêu thích để theo dõi thông tin và sự kiện."
      showToast={showToast}
    >
      <div className="my-clubs-page">
        <div className="my-clubs-stats">
          <article className="my-clubs-stat my-clubs-stat--highlight">
            <span className="my-clubs-stat__label">CLB yêu thích</span>
            <strong className="my-clubs-stat__value">{loading ? '—' : clubs.length}</strong>
            <span className="my-clubs-stat__hint">Xem thông tin & sự kiện CLB</span>
          </article>
        </div>

        <div className="my-clubs-toolbar">
          <div className="my-clubs-search">
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, lĩnh vực hoặc mô tả..."
              aria-label="Tìm kiếm câu lạc bộ yêu thích"
            />
          </div>
          <button
            type="button"
            className="primary-button my-clubs-explore-btn"
            onClick={() => navigate('/clubs')}
          >
            Khám phá CLB
          </button>
        </div>

        {!loading && clubs.length > 0 && categories.length > 1 && (
          <div className="my-clubs-filters">
            <button
              type="button"
              className={`my-clubs-filter ${activeCategory === '' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('')}
            >
              Tất cả
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`my-clubs-filter ${activeCategory === category ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <MyClubsSkeleton />
        ) : clubs.length === 0 ? (
          <div className="my-clubs-empty">
            <div className="my-clubs-empty__icon" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
                <path
                  d="M32 52s-14-9.5-14-20a8 8 0 0114-5 8 8 0 0114 5c0 10.5-14 20-14 20z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>Chưa có CLB yêu thích</h3>
            <p>
              Vào trang chi tiết CLB và bấm <strong>Yêu thích</strong> để lưu CLB vào danh sách này.
            </p>
            <button
              type="button"
              className="primary-button my-clubs-empty__cta"
              onClick={() => navigate('/clubs')}
            >
              Khám phá câu lạc bộ
            </button>
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="my-clubs-empty my-clubs-empty--compact">
            <h3>Không tìm thấy kết quả</h3>
            <p>Thử đổi từ khóa hoặc bộ lọc lĩnh vực khác.</p>
            <button
              type="button"
              className="student-outline-btn"
              onClick={() => {
                setSearch('');
                setActiveCategory('');
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <>
            <p className="my-clubs-result-meta">
              Hiển thị <strong>{filteredClubs.length}</strong>
              {filteredClubs.length !== clubs.length && <> / {clubs.length}</>}{' '}
              câu lạc bộ yêu thích
            </p>
            <div className="my-clubs-grid">
              {filteredClubs.map((club) => (
                <article key={club.id} className="my-clubs-card">
                  <div className="my-clubs-card__cover-wrap">
                    <img
                      src={club.coverImage}
                      alt=""
                      className="my-clubs-card__cover"
                      loading="lazy"
                    />
                    <div className="my-clubs-card__cover-overlay" aria-hidden="true" />
                    <span
                      className="my-clubs-card__category"
                      style={{ backgroundColor: getCategoryColor(club.category) }}
                    >
                      {club.category}
                    </span>
                    <span className="my-clubs-card__status my-clubs-card__status--following">
                      Yêu thích
                    </span>
                  </div>

                  <div className="my-clubs-card__body">
                    <div
                      className="my-clubs-card__logo"
                      style={{ backgroundColor: club.logoColor }}
                      aria-hidden="true"
                    >
                      {club.logoText}
                    </div>

                    <h3 className="my-clubs-card__name">{club.name}</h3>

                    <div className="my-clubs-card__meta">
                      <span>
                        <MembersIcon />
                        {formatMemberCount(club.memberCount)} thành viên
                      </span>
                    </div>

                    <p className="my-clubs-card__desc">{club.description}</p>

                    <div className="my-clubs-card__footer">
                      <time className="my-clubs-card__date">
                        Yêu thích từ {formatClubDate(club.followedAt)}
                      </time>
                      <div className="my-clubs-card__actions">
                        <button
                          type="button"
                          className="my-clubs-card__view-btn"
                          onClick={() => navigate(`/clubs/${club.slug}`)}
                        >
                          Xem chi tiết
                        </button>
                        <button
                          type="button"
                          className="my-clubs-card__unfollow-btn"
                          onClick={() => handleRemoveFavorite(club)}
                        >
                          Bỏ yêu thích
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

export default MyClubs;
