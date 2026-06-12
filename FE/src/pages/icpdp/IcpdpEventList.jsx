import { useEffect, useMemo, useState } from 'react';
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
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'approved', label: 'Mở đăng ký' },
  { value: 'live', label: 'Đang diễn ra' },
  { value: 'ended', label: 'Đã kết thúc' },
  { value: 'pending_icpdp', label: 'Chờ ICPDP' },
  { value: 'pending_ctsv', label: 'Chờ CTSV' }
];

const matchesStatusFilter = (statusKey, filter) => {
  if (!filter) return true;
  if (filter === 'published') return statusKey === 'approved' || statusKey === 'live';
  return statusKey === filter;
};

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

const getSourceTone = (source) => {
  if (source === 'school') return 'school';
  if (source === 'partner') return 'partner';
  return 'club';
};
const getSourceLabel = (source) => {
  if (source === 'school') return 'Cấp trường';
  if (source === 'partner') return 'Đối tác';
  return 'CLB';
};

const IcpdpEventList = () => {
  const { showToast } = useOutletContext() || {};
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [sourceFilter, setSourceFilter] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('');

  const loadEvents = () => {
    setLoading(true);
    fetchIcpdpEvents()
      .then((d) => {
        setEvents(d.events || []);
      })
      .catch((err) => {
        setEvents([]);
        const msg =
          err.status === 401 || err.status === 403
            ? 'Phiên đăng nhập hết hạn — vui lòng đăng xuất và đăng nhập lại.'
            : 'Không tải được sự kiện — kiểm tra backend đang chạy.';
        showToast?.(msg, 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleFilter = (e) => {
    e?.preventDefault();
    loadEvents();
    showToast?.(`Đã lọc danh sách sự kiện.`, 'success');
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      const title = (ev.title || '').toLowerCase();
      const location = (ev.location || '').toLowerCase();
      if (q && !title.includes(q) && !location.includes(q)) {
        return false;
      }
      if (categoryFilter !== 'Tất cả' && ev.category !== categoryFilter) {
        return false;
      }
      if (sourceFilter !== 'Tất cả') {
        const sourceMap = { 'Cấp trường': 'school', 'Đối tác': 'partner', 'Câu lạc bộ': 'club' };
        if (ev.source !== sourceMap[sourceFilter]) return false;
      }
      if (!matchesStatusFilter(ev.statusKey, statusFilter)) {
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
          <Link to="/icpdp/events/create" className="ctsv-events-hero-cta">
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
              placeholder="Tìm kiếm theo tên, địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ctsv-events-search-input"
            />
          </label>
          <div className="ctsv-events-filter-selects">
            <AppSelect
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              options={TIME_FILTERS}
              fullWidth={false}
            />
            <AppSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={CATEGORY_FILTERS}
              fullWidth={false}
            />
            <AppSelect
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              options={SOURCE_FILTERS}
              fullWidth={false}
            />
            <AppSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_FILTERS}
              fullWidth={false}
            />
          </div>
          <button type="submit" className="ctsv-events-filter-btn" disabled={loading}>
            {loading ? 'Đang lọc…' : 'Lọc kết quả'}
          </button>
        </form>
      </section>

      {loading ? (
        <div className="ctsv-events-grid" aria-busy="true" aria-label="Đang tải sự kiện">
          {Array.from({ length: 8 }, (_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ctsv-events-empty">
          <span className="ctsv-events-empty-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <h2>Không tìm thấy sự kiện</h2>
          <p>
            {events.length === 0
              ? 'Chưa có sự kiện trong hệ thống hoặc không tải được dữ liệu. Chạy `node seed-events.js` trong thư mục BE nếu DB trống.'
              : 'Thử đổi từ khóa hoặc bộ lọc thời gian, chủ đề.'}
          </p>
          <button type="button" className="ctsv-events-filter-btn" onClick={() => {
            setSearchQuery('');
            setTimeFilter('Tất cả');
            setCategoryFilter('Tất cả');
            setSourceFilter('Tất cả');
            setStatusFilter('');
          }}>
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="ctsv-events-grid">
          {filtered.map((ev) => {
            const tone = getSourceTone(ev.source);
            const label = getSourceLabel(ev.source);
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
                  <span className={`ctsv-events-card-source ctsv-events-card-source--${tone}`}>
                    {label}
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
                      Vé còn <strong>{ev.remainingTickets || 0}</strong>/{ev.totalTickets || 100}
                    </span>
                    <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>{ev.status}</span>
                  </div>
                  <Link
                    to={`/icpdp/events/${ev.id}`}
                    className="ctsv-events-card-action btn-card-view"
                  >
                    Xem chi tiết
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

export default IcpdpEventList;

