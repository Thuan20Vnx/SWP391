import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import AppSelect from '../../components/ui/AppSelect';
import { fetchCtsvEvents, MOCK_EVENTS } from '../../services/ctsvApi';
import { getCtsvEventAccess } from '../../utils/ctsvEventAccess';
import { statusClass } from '../../utils/eventStatus';

const TIME_FILTER_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả thời gian' },
  { value: 'Hôm nay', label: 'Hôm nay' },
  { value: 'Tuần này', label: 'Tuần này' }
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  { value: 'Âm nhạc', label: 'Âm nhạc' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Công nghệ', label: 'Công nghệ' },
  { value: 'Kết nối', label: 'Kết nối' }
];

const SOURCE_META = {
  school: { label: 'Cấp trường', tone: 'school' },
  partner: { label: 'Đối tác', tone: 'partner' },
  club: { label: 'CLB', tone: 'club' }
};

const getSourceMeta = (source) => SOURCE_META[source] || SOURCE_META.club;

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

const CtsvEventList = () => {
  const { showToast } = useOutletContext() || {};
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(
    (overrides = {}) => {
      const q = overrides.q ?? searchQuery;
      const category = overrides.category ?? categoryFilter;
      const time = overrides.time ?? timeFilter;
      setLoading(true);
      return fetchCtsvEvents({ q, category, time })
        .then((d) => {
          const list = d.events || [];
          setEvents(list);
          return list;
        })
        .catch(() => {
          setEvents(MOCK_EVENTS);
          showToast?.('Dùng dữ liệu demo — kiểm tra BE đang chạy.', 'info');
          return MOCK_EVENTS;
        })
        .finally(() => setLoading(false));
    },
    [searchQuery, categoryFilter, timeFilter, showToast]
  );

  useEffect(() => {
    loadEvents();
    // Chỉ tải lần đầu; lọc khi bấm "Lọc kết quả"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const managedCount = useMemo(
    () => events.filter((ev) => getCtsvEventAccess(ev).canManage).length,
    [events]
  );

  const handleFilter = async (e) => {
    e?.preventDefault();
    const list = await loadEvents();
    showToast?.(`Hiển thị ${list?.length ?? 0} sự kiện.`, 'success');
  };

  return (
    <div className="ctsv-events-page">
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">Quản lý sự kiện CTSV</span>
          <h1>Tìm kiếm &amp; Duyệt sự kiện</h1>
          <p>
            Phê duyệt sự kiện cấp trường; sự kiện CLB và đối tác chỉ xem thông tin (ICPDP quản lý CLB).
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : events.length}</span>
            <span className="ctsv-events-hero-stat-label">Sự kiện trong danh sách</span>
          </div>
          <Link to="/ctsv/events/create" className="ctsv-events-hero-cta">
            Tạo sự kiện cấp trường
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
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              options={TIME_FILTER_OPTIONS}
              fullWidth={false}
            />
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
            {managedCount > 0 && (
              <>
                {' '}
                · <span className="ctsv-events-filter-summary-manage">{managedCount} cần quản lý / phê duyệt</span>
              </>
            )}
          </p>
        )}
      </section>

      {loading ? (
        <div className="ctsv-events-grid" aria-busy="true" aria-label="Đang tải sự kiện">
          {Array.from({ length: 8 }, (_, i) => (
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
          <h2>Không tìm thấy sự kiện</h2>
          <p>Thử đổi từ khóa hoặc bộ lọc thời gian, chủ đề.</p>
          <button type="button" className="ctsv-events-filter-btn" onClick={() => loadEvents()}>
            Tải lại
          </button>
        </div>
      ) : (
        <div className="ctsv-events-grid">
          {events.map((ev) => {
            const access = getCtsvEventAccess(ev);
            const source = getSourceMeta(ev.source);
            return (
              <article key={ev.id} className="ctsv-events-card">
                <div className="ctsv-events-card-media">
                  <img
                    src={ev.image || ev.thumbnail}
                    alt=""
                    className="ctsv-events-card-img"
                    loading="lazy"
                  />
                  <span className="ctsv-events-card-category">{ev.category}</span>
                  <span className={`ctsv-events-card-source ctsv-events-card-source--${source.tone}`}>
                    {source.label}
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
                    to={`/ctsv/events/${ev.id}`}
                    className={`ctsv-events-card-action btn-card-register ${access.buttonClass}`}
                  >
                    {access.label}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CtsvEventList;
