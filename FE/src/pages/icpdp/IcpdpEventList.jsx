import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import AppSelect from '../../components/ui/AppSelect';
import { fetchIcpdpEvents } from '../../services/icpdpApi';
import { statusClass } from '../../utils/eventStatus';

const TIME_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả thời gian' },
  { value: 'Hôm nay', label: 'Hôm nay' },
  { value: 'Tuần này', label: 'Tuần này' },
  { value: 'Tháng này', label: 'Tháng này' }
];

const CATEGORY_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  { value: 'Học thuật', label: 'Học thuật' },
  { value: 'Văn hóa', label: 'Văn hóa' },
  { value: 'Thể thao', label: 'Thể thao' },
  { value: 'Âm nhạc', label: 'Âm nhạc' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Công nghệ', label: 'Công nghệ' },
  { value: 'Kết nối', label: 'Kết nối' }
];

const SOURCE_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả nguồn' },
  { value: 'Cấp trường', label: 'Cấp trường' },
  { value: 'Đối tác', label: 'Đối tác' },
  { value: 'Câu lạc bộ', label: 'Câu lạc bộ' }
];

const STATUS_FILTERS = [
  { id: '', label: 'Tất cả trạng thái' },
  { id: 'published', label: 'Đã xuất bản (Publish)' },
  { id: 'approved', label: 'Mở đăng ký' },
  { id: 'live', label: 'Đang diễn ra' },
  { id: 'ended', label: 'Đã kết thúc' }
];

const EventRowSkeleton = () => (
  <article className="ctsv-events-row ctsv-events-row--skeleton" aria-hidden>
    <div className="ctsv-events-row-thumb" />
    <div className="ctsv-events-row-main">
      <div className="sk sk-line sk-line--lg" />
      <div className="sk sk-line" />
      <div className="sk sk-line sk-line--short" />
    </div>
    <div className="ctsv-events-row-aside">
      <div className="sk sk-btn" />
      <div className="sk sk-btn sk-btn--outline" />
    </div>
  </article>
);

const IcpdpEventList = () => {
  const { showToast } = useOutletContext() || {};
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [sourceFilter, setSourceFilter] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchIcpdpEvents()
      .then((d) => {
        if (!cancelled) setEvents(d.events || []);
      })
      .catch(() => {
        if (!cancelled) showToast?.('Không tải được danh sách sự kiện.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (q && !ev.title.toLowerCase().includes(q) && !ev.location.toLowerCase().includes(q)) {
        return false;
      }
      if (categoryFilter !== 'Tất cả' && ev.category !== categoryFilter) {
        return false;
      }
      if (sourceFilter !== 'Tất cả') {
        const sourceMap = { 'Cấp trường': 'school', 'Đối tác': 'partner', 'Câu lạc bộ': 'club' };
        if (ev.source !== sourceMap[sourceFilter]) return false;
      }
      if (statusFilter && ev.statusKey !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [events, searchQuery, categoryFilter, sourceFilter, statusFilter]);

  return (
    <div className="ctsv-events-page">
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">Giám sát sự kiện</span>
          <h1>Xem sự kiện toàn trường</h1>
          <p>
            Giám sát toàn bộ các sự kiện từ Cấp trường, Đối tác và Câu lạc bộ trên hệ thống. (Chế độ chỉ xem)
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">Sự kiện</span>
          </div>
        </div>
      </header>

      <section className="ctsv-events-toolbar">
        <div className="ctsv-events-search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            type="search"
            placeholder="Tìm theo tên sự kiện, địa điểm…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm sự kiện"
          />
        </div>
        <div className="ctsv-events-filters" role="group" aria-label="Bộ lọc sự kiện">
          <AppSelect
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            options={TIME_FILTERS}
            variant="filter"
            aria-label="Lọc thời gian"
          />
          <AppSelect
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={CATEGORY_FILTERS}
            variant="filter"
            aria-label="Lọc chủ đề"
          />
          <AppSelect
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            options={SOURCE_FILTERS}
            variant="filter"
            aria-label="Lọc nguồn"
          />
        </div>
      </section>

      <div className="icpdp-status-filters" style={{ marginBottom: 20 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`icpdp-status-chip ${statusFilter === f.id ? 'is-active' : ''}`}
            onClick={() => setStatusFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="ctsv-events-list">
        {loading ? (
          <>
            <EventRowSkeleton />
            <EventRowSkeleton />
            <EventRowSkeleton />
            <EventRowSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <div className="ctsv-events-empty">
            <span className="ctsv-events-empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </span>
            <h2>Không có sự kiện nào</h2>
            <p>Thử đổi bộ lọc hoặc từ khóa tìm kiếm để xem kết quả khác.</p>
            <button
              type="button"
              className="ctsv-events-filter-btn"
              onClick={() => {
                setSearchQuery('');
                setTimeFilter('Tất cả');
                setCategoryFilter('Tất cả');
                setSourceFilter('Tất cả');
                setStatusFilter('');
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          filtered.map((ev) => (
            <article key={ev.id} className="ctsv-events-row">
              <div className="ctsv-events-row-thumb">
                <img src={ev.image} alt="" loading="lazy" />
              </div>
              <div className="ctsv-events-row-main">
                <div className="ctsv-events-row-tags">
                  <span className={`ctsv-events-source ctsv-events-source--${ev.source}`}>
                    {ev.source === 'school' ? 'Cấp trường' : ev.source === 'partner' ? 'Đối tác' : 'CLB'}
                  </span>
                  <span className="ctsv-events-category">{ev.category}</span>
                </div>
                <h3>{ev.title}</h3>
                <p className="ctsv-events-meta">
                  <span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {ev.date} {ev.time}
                  </span>
                  <span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    {ev.location}
                  </span>
                </p>
              </div>
              <div className="ctsv-events-row-aside">
                <div className="ctsv-events-row-status">
                  <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>
                    {ev.status}
                  </span>
                </div>
                <div className="ctsv-events-row-actions">
                  <Link to={`/icpdp/events/${ev.id}`} className="ctsv-btn-outline">
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default IcpdpEventList;
