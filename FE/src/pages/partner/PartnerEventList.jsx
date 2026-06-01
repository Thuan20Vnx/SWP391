import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import AppSelect from '../../components/ui/AppSelect';
import PartnerCampusEventsSection from '../../components/partner/PartnerCampusEventsSection';
import { fetchPartnerEvents } from '../../services/partnerApi';
import { statusClass } from '../../utils/eventStatus';
import { CTSV_CATEGORY_OPTIONS, getCategoryDisplayLabel } from '../../constants/eventCategories';

const CATEGORY_FILTER_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  ...CTSV_CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))
];

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconPin = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3-3" />
  </svg>
);

const EventCardSkeleton = () => (
  <article className="ctsv-events-card ctsv-events-card--skeleton" aria-hidden>
    <div className="ctsv-events-card-media sk" />
    <div className="ctsv-events-card-body">
      <div className="sk sk-line sk-line--lg" />
      <div className="sk sk-line" />
      <div className="sk sk-line sk-line--short" />
      <div className="sk sk-btn" />
    </div>
  </article>
);

const PartnerEventList = () => {
  const { showToast } = useOutletContext() || {};
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(
    (overrides = {}) => {
      const q = overrides.q ?? searchQuery;
      const category = overrides.category ?? categoryFilter;
      setLoading(true);
      return fetchPartnerEvents({ q, category })
        .then((d) => {
          const list = d.events || [];
          setEvents(list);
          return list;
        })
        .catch((err) => {
          setEvents([]);
          const msg =
            err.status === 401 || err.status === 403
              ? 'Phiên đăng nhập hết hạn — vui lòng đăng xuất và đăng nhập lại.'
              : 'Không tải được sự kiện — kiểm tra backend đang chạy.';
          showToast?.(msg, 'error');
          return [];
        })
        .finally(() => setLoading(false));
    },
    [searchQuery, categoryFilter, showToast]
  );

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = async (e) => {
    e?.preventDefault();
    const list = await loadEvents();
    showToast?.(`Hiển thị ${list?.length ?? 0} sự kiện.`, 'success');
  };

  return (
    <div className="ctsv-events-page">
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">Quản lý sự kiện</span>
          <h1>Sự kiện tài trợ của bạn</h1>
          <p>Theo dõi và quản lý các sự kiện do doanh nghiệp bạn tài trợ hoặc đồng tổ chức.</p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : events.length}</span>
            <span className="ctsv-events-hero-stat-label">Sự kiện trong danh sách</span>
          </div>
          <Link to="/partner/proposals/create" className="ctsv-events-hero-cta">
            Tạo sự kiện mới
          </Link>
        </div>
      </header>

      <section className="ctsv-events-filter-card">
        <form className="ctsv-events-filter-form" onSubmit={handleFilter}>
          <label className="ctsv-events-search">
            <span className="ctsv-events-search-icon">
              <IconSearch />
            </span>
            <input
              type="search"
              placeholder="Tìm kiếm theo tên, địa điểm, danh mục..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ctsv-events-search-input"
            />
          </label>
          <div className="ctsv-events-filter-selects">
            <AppSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={CATEGORY_FILTER_OPTIONS}
              fullWidth={false}
            />
          </div>
          <button type="submit" className="ctsv-events-filter-btn" disabled={loading}>
            {loading ? 'Đang lọc…' : 'Lọc kết quả'}
          </button>
        </form>
        {!loading && (
          <p className="ctsv-events-filter-summary">
            <strong>{events.length}</strong> sự kiện
          </p>
        )}
      </section>

      {loading ? (
        <div className="ctsv-events-grid" aria-busy="true" aria-label="Đang tải sự kiện">
          {Array.from({ length: 6 }, (_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="ctsv-events-empty">
          <span className="ctsv-events-empty-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <h2>Chưa có sự kiện</h2>
          <p>Gửi đề xuất mới để CTSV xem xét và tạo sự kiện sau khi được phê duyệt.</p>
          <Link to="/partner/proposals/create" className="ctsv-events-filter-btn">
            Tạo sự kiện mới
          </Link>
        </div>
      ) : (
        <div className="ctsv-events-grid">
          {events.map((ev) => (
            <article key={ev.id} className="ctsv-events-card">
              <div className="ctsv-events-card-media">
                <img
                  src={ev.image || ev.thumbnail}
                  alt=""
                  className="ctsv-events-card-img"
                  loading="lazy"
                />
                <span className="ctsv-events-card-category">
                  {getCategoryDisplayLabel(ev.category) || ev.category}
                </span>
                <span className="ctsv-events-card-source ctsv-events-card-source--partner">
                  Đối tác
                </span>
              </div>
              <div className="ctsv-events-card-body">
                <h3 className="ctsv-events-card-title">{ev.title}</h3>
                <ul className="ctsv-events-card-meta">
                  <li>
                    <IconCalendar />
                    <span>
                      {ev.date} · {ev.time}
                    </span>
                  </li>
                  <li>
                    <IconPin />
                    <span>{ev.location || 'Chưa có địa điểm'}</span>
                  </li>
                </ul>
                <div className="ctsv-events-card-stats">
                  <span className="ctsv-events-ticket">
                    Vé còn <strong>{ev.remainingTickets}</strong>/{ev.totalTickets}
                  </span>
                  <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>{ev.status}</span>
                </div>
                <Link
                  to={`/partner/events/${ev.id}`}
                  className="ctsv-events-card-action btn-card-register btn-card-register--primary"
                >
                  Xem chi tiết
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <PartnerCampusEventsSection
        showToast={showToast}
        title="Tất cả sự kiện"
        description="Đăng ký tham gia các sự kiện campus đang mở — miễn phí vé cho đối tác."
        className="partner-events-campus-block"
      />
    </div>
  );
};

export default PartnerEventList;
