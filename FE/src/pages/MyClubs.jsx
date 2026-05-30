import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { getCategoryColor, formatMemberCount } from '../data/clubDiscoveryData';

const tabs = [
  { key: 'joined', label: 'Đã tham gia' },
  { key: 'pending', label: 'Đang yêu cầu' },
  { key: 'following', label: 'Đang theo dõi' },
];

const emptyCopy = {
  joined: {
    title: 'Chưa tham gia CLB nào',
    desc: 'Gửi yêu cầu tham gia các câu lạc bộ bạn quan tâm để trở thành thành viên chính thức.',
  },
  pending: {
    title: 'Không có yêu cầu đang chờ',
    desc: 'Các yêu cầu tham gia CLB sẽ hiển thị tại đây cho đến khi được duyệt.',
  },
  following: {
    title: 'Chưa theo dõi CLB nào',
    desc: 'Theo dõi CLB để nhận cập nhật sự kiện và hoạt động mới nhất.',
  },
};

const formatClubDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

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
  const [activeTab, setActiveTab] = useState('joined');
  const [clubs, setClubs] = useState([]);
  const [counts, setCounts] = useState({ joined: 0, pending: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/user/my-clubs?tab=${activeTab}`, { headers: getAuthHeaders(false) })
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
          setCounts(data.counts || { joined: 0, pending: 0, following: 0 });
        } else {
          setClubs([]);
        }
      })
      .catch((err) => {
        if (err.message !== 'Unauthorized') {
          showToast?.('Không thể tải danh sách câu lạc bộ.', 'error');
        }
        setClubs([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, navigate, showToast]);

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

  const handleUnfollow = async (club) => {
    try {
      const res = await fetch(`${API_BASE}/api/clubs/${club.clubId}/follow`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast?.(data.message || 'Không thể bỏ theo dõi.', 'error');
        return;
      }

      setClubs((prev) => prev.filter((c) => c.id !== club.id));
      setCounts((prev) => ({ ...prev, following: Math.max(0, prev.following - 1) }));
      showToast?.(data.message || 'Đã bỏ theo dõi câu lạc bộ.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Không thể kết nối máy chủ.', 'error');
    }
  };

  const handleCancelMembership = async (club) => {
    const isPending = activeTab === 'pending';
    const confirmMsg = isPending
      ? 'Hủy yêu cầu tham gia CLB này?'
      : 'Rời khỏi câu lạc bộ này?';

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE}/api/clubs/${club.clubId}/join`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast?.(data.message || 'Không thể cập nhật trạng thái CLB.', 'error');
        return;
      }

      setClubs((prev) => prev.filter((c) => c.id !== club.id));
      setCounts((prev) => ({
        ...prev,
        [activeTab]: Math.max(0, prev[activeTab] - 1),
      }));
      showToast?.(data.message || 'Đã cập nhật.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Không thể kết nối máy chủ.', 'error');
    }
  };

  const getDateLabel = (club) => {
    if (activeTab === 'following') {
      return `Theo dõi từ ${formatClubDate(club.followedAt)}`;
    }
    if (activeTab === 'pending') {
      return `Yêu cầu ngày ${formatClubDate(club.requestedAt)}`;
    }
    return `Tham gia từ ${formatClubDate(club.joinedAt)}`;
  };

  const getSecondaryAction = (club) => {
    if (activeTab === 'following') {
      return {
        label: 'Bỏ theo dõi',
        handler: () => handleUnfollow(club),
      };
    }
    if (activeTab === 'pending') {
      return {
        label: 'Hủy yêu cầu',
        handler: () => handleCancelMembership(club),
      };
    }
    return {
      label: 'Rời CLB',
      handler: () => handleCancelMembership(club),
    };
  };

  const empty = emptyCopy[activeTab];

  return (
    <StudentDashboardLayout
      activeMenu="my-clubs"
      pageTitle="Câu lạc bộ của tôi"
      pageSubtitle="Quản lý CLB đã tham gia, yêu cầu đang chờ và danh sách đang theo dõi."
      showToast={showToast}
    >
      <div className="my-clubs-page">
        <div className="my-clubs-stats">
          <article className="my-clubs-stat">
            <span className="my-clubs-stat__label">Đã tham gia</span>
            <strong className="my-clubs-stat__value">{loading ? '—' : counts.joined}</strong>
            <span className="my-clubs-stat__hint">Thành viên chính thức</span>
          </article>
          <article className="my-clubs-stat">
            <span className="my-clubs-stat__label">Đang yêu cầu</span>
            <strong className="my-clubs-stat__value">{loading ? '—' : counts.pending}</strong>
            <span className="my-clubs-stat__hint">Chờ CLB duyệt</span>
          </article>
          <article className="my-clubs-stat my-clubs-stat--highlight">
            <span className="my-clubs-stat__label">Đang theo dõi</span>
            <strong className="my-clubs-stat__value">{loading ? '—' : counts.following}</strong>
            <span className="my-clubs-stat__hint">Cập nhật hoạt động CLB</span>
          </article>
        </div>

        <div className="student-tabs my-clubs-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`student-tab ${activeTab === tab.key ? 'student-tab--active' : ''}`}
              onClick={() => {
                setActiveTab(tab.key);
                setSearch('');
                setActiveCategory('');
              }}
            >
              {tab.label}
              {!loading && counts[tab.key] > 0 && (
                <span className="my-clubs-tab-count">{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="my-clubs-toolbar">
          <div className="my-clubs-search">
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, lĩnh vực hoặc mô tả..."
              aria-label="Tìm kiếm câu lạc bộ"
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
                <rect x="8" y="18" width="48" height="34" rx="6" stroke="currentColor" strokeWidth="2.5" />
                <path d="M8 26h48" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="22" cy="38" r="6" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>
            <h3>{empty.title}</h3>
            <p>{empty.desc}</p>
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
              câu lạc bộ
            </p>
            <div className="my-clubs-grid">
              {filteredClubs.map((club) => {
                const secondary = getSecondaryAction(club);
                return (
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
                      <span
                        className={`my-clubs-card__status my-clubs-card__status--${activeTab}`}
                      >
                        {club.status}
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
                        <time className="my-clubs-card__date">{getDateLabel(club)}</time>
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
                            onClick={secondary.handler}
                          >
                            {secondary.label}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

export default MyClubs;
