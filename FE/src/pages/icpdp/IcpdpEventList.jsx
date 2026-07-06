import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../../components/ui/AppSelect';
import { fetchIcpdpEvents } from '../../services/icpdpApi';
import EventDiscoveryCard from '../../components/EventDiscoveryCard';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';
import { resolveEventDisplayImage } from '../../utils/eventDisplay';
import { isPendingApproval } from '../../utils/eventStatus';

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
  { value: 'Cấp trường', label: 'Cấp trường (IC-PDP)' },
  { value: 'Câu lạc bộ', label: 'Câu lạc bộ' }
];

// IC-PDP chỉ quản lý sự kiện của CLB và sự kiện cấp trường do IC-PDP tổ chức.
const isIcpdpScopeEvent = (ev) =>
  ev.source === 'club' ||
  (ev.source === 'school' && ev.schoolOrganizerRole === 'icpdp');

const isPendingStatus = (sk) =>
  ['pending_icpdp', 'pending_ctsv', 'pending_admin', 'revision'].includes(sk);

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả', tone: 'all', match: () => true },
  { key: 'pending', label: 'Chờ duyệt', tone: 'warning', match: (ev) => isPendingStatus(ev.statusKey) },
  { key: 'approved', label: 'Mở đăng ký', tone: 'success', match: (ev) => ev.statusKey === 'approved' },
  { key: 'live', label: 'Đang diễn ra', tone: 'info', match: (ev) => ev.statusKey === 'live' },
  { key: 'ended', label: 'Đã kết thúc', tone: 'all', match: (ev) => ev.statusKey === 'ended' },
];

const cardStateFromEv = (ev) => {
  const s = ev.statusKey || ev.status || '';
  if (s === 'ended') return 'expired';
  if (s === 'postponed') return 'postponed';
  return 'active';
};

const toDiscoveryCard = (ev) => ({
  id: String(ev._id || ev.id || ''),
  title: ev.title,
  thumbnail: resolveEventDisplayImage(ev),
  isPending: isPendingApproval(ev),
  category: ev.category || 'Sự kiện',
  categoryLabel: getCategoryDisplayLabel(ev.category) || ev.category,
  dateLabel: ev.date ? `${ev.date}${ev.time ? ' ' + ev.time : ''}` : '',
  location: ev.location || '',
  filledSlots: ev.registeredCount ?? (ev.totalTickets - (ev.remainingTickets ?? ev.totalTickets)) ?? 0,
  totalSlots: ev.totalTickets || ev.capacity || 0,
  cardState: cardStateFromEv(ev),
  primaryLabel: 'Quản lý',
  priceLabel: ev.ticketPrice > 0 ? `${Number(ev.ticketPrice).toLocaleString('vi-VN')}đ` : 'MIỄN PHÍ',
  organizerLabel: ev.source === 'school' ? 'IC-PDP' : 'CLB',
});

const PAGE_SIZE = 6;

const SectionPager = ({ page, total, onChange }) => {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="ctsv-section-pager">
      <button type="button" className="ctsv-pager-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Trước
      </button>
      <span className="ctsv-pager-label">Trang {page} / {totalPages}</span>
      <button type="button" className="ctsv-pager-btn" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        Sau
      </button>
    </div>
  );
};

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3-3" />
  </svg>
);

const IcpdpEventList = () => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { showToast, headerSearch = '', registerHeaderSearchSubmit } = outlet;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [localSearch, setLocalSearch] = useState('');
  const searchQuery = headerSearch.trim() || localSearch.trim();
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [sourceFilter, setSourceFilter] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const loadEvents = () => {
    setLoading(true);
    fetchIcpdpEvents({ status: 'all' })
      .then((d) => setEvents(d.events || []))
      .catch((err) => {
        setEvents([]);
        const msg =
          err.status === 401 || err.status === 403
            ? 'Phiên đăng nhập hết hạn — vui lòng đăng xuất và đăng nhập lại.'
            : 'Không tải được sự kiện — kiểm tra backend đang chạy.';
        showToast?.(msg, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEvents(); }, []);

  useEffect(() => {
    registerHeaderSearchSubmit?.(() => {});
    return () => registerHeaderSearchSubmit?.(null);
  }, [registerHeaderSearchSubmit]);

  const handleFilter = (e) => {
    e?.preventDefault();
    loadEvents();
    showToast?.('Đã lọc danh sách sự kiện.', 'success');
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, sourceFilter, statusFilter]);

  // Danh sách sau khi lọc scope + tìm kiếm + chủ đề + nguồn (chưa lọc trạng thái) —
  // dùng để đếm số lượng cho các thẻ filter trạng thái.
  const baseFiltered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return events.filter(isIcpdpScopeEvent).filter((ev) => {
      if (q && !(ev.title || '').toLowerCase().includes(q) && !(ev.location || '').toLowerCase().includes(q)) return false;
      if (categoryFilter !== 'Tất cả' && ev.category !== categoryFilter) return false;
      if (sourceFilter !== 'Tất cả') {
        const sourceMap = { 'Cấp trường': 'school', 'Câu lạc bộ': 'club' };
        if (ev.source !== sourceMap[sourceFilter]) return false;
      }
      return true;
    });
  }, [events, searchQuery, categoryFilter, sourceFilter]);

  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_TABS.forEach((tab) => {
      counts[tab.key] = baseFiltered.filter(tab.match).length;
    });
    return counts;
  }, [baseFiltered]);

  const filtered = useMemo(() => {
    // Ưu tiên đưa sự kiện đang chờ duyệt lên đầu để IC-PDP thấy ngay.
    const pendingRank = (sk) => {
      if (sk === 'pending_icpdp') return 0;
      if (sk === 'pending_ctsv') return 1;
      if (sk === 'pending_admin') return 2;
      if (sk === 'revision') return 3;
      return 9;
    };
    const tab = STATUS_TABS.find((t) => t.key === statusFilter) || STATUS_TABS[0];
    return baseFiltered.filter(tab.match).sort((a, b) => {
      const ra = pendingRank(a.statusKey);
      const rb = pendingRank(b.statusKey);
      if (ra !== rb) return ra - rb;
      return new Date(b.startDate || 0) - new Date(a.startDate || 0);
    });
  }, [baseFiltered, statusFilter]);

  const pagedEvents = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  return (
    <div className="ctsv-events-page">
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">Quản lý sự kiện IC-PDP</span>
          <h1>Quản lý sự kiện CLB & IC-PDP</h1>
          <p>Quản lý sự kiện của Câu lạc bộ và sự kiện cấp trường do IC-PDP tổ chức — duyệt, theo dõi và xử lý điều phối.</p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">Sự kiện</span>
          </div>
          <button type="button" className="ctsv-events-hero-cta" onClick={() => navigate('/icpdp/events/create')}>
            Tạo sự kiện cấp trường
          </button>
        </div>
      </header>

      <section className="ctsv-events-filter-card">
        <div className="evt-filter-tabs" role="group" aria-label="Trạng thái">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`evt-filter-tab evt-filter-tab--${tab.tone}${statusFilter === tab.key ? ' is-active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              <span className="evt-filter-tab__label">{tab.label}</span>
              <span className="evt-filter-tab__count">{statusCounts[tab.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <form className="ctsv-events-filter-form" onSubmit={handleFilter}>
          <label className="ctsv-events-search">
            <span className="ctsv-events-search-icon"><IconSearch /></span>
            <input
              type="search"
              placeholder="Tìm kiếm theo tên, địa điểm..."
              value={headerSearch || localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="ctsv-events-search-input"
            />
          </label>
          <div className="ctsv-events-filter-selects">
            <AppSelect value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} options={TIME_FILTERS} fullWidth={false} />
            <AppSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={CATEGORY_FILTERS} fullWidth={false} />
            <AppSelect value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} options={SOURCE_FILTERS} fullWidth={false} />
          </div>
          <button type="submit" className="ctsv-events-filter-btn" disabled={loading}>
            {loading ? 'Đang lọc…' : 'Lọc kết quả'}
          </button>
        </form>
      </section>

      {loading ? (
        <div className="event-grid-cards" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="event-discovery-card event-discovery-card--active" style={{ minHeight: 320 }}>
              <div className="event-discovery-card__media" style={{ background: '#f1f5f9' }} />
              <div className="event-discovery-card__body" style={{ padding: 16 }}>
                <div className="sk sk-line sk-line--lg" />
                <div className="sk sk-line" />
                <div className="sk sk-line sk-line--short" />
              </div>
            </div>
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
              ? 'Chưa có sự kiện trong hệ thống hoặc không tải được dữ liệu.'
              : 'Thử đổi từ khóa hoặc bộ lọc thời gian, chủ đề.'}
          </p>
          <button type="button" className="ctsv-events-filter-btn" onClick={() => {
            setLocalSearch('');
            setTimeFilter('Tất cả');
            setCategoryFilter('Tất cả');
            setSourceFilter('Tất cả');
            setStatusFilter('all');
          }}>
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <>
          <div className="event-grid-cards">
            {pagedEvents.map((ev) => (
              <EventDiscoveryCard
                key={ev.id}
                event={toDiscoveryCard(ev)}
                protectedImage
                viewOnly
                onPrimaryAction={() => navigate(`/icpdp/events/${ev.id}`)}
              />
            ))}
          </div>
          <SectionPager page={page} total={filtered.length} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default IcpdpEventList;
