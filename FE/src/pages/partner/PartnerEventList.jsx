import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import AppSelect from '../../components/ui/AppSelect';
import EventDiscoveryCard from '../../components/EventDiscoveryCard';
import PartnerCampusEventsSection from '../../components/partner/PartnerCampusEventsSection';
import { fetchPartnerEvents } from '../../services/partnerApi';
import { isPendingApproval } from '../../utils/eventStatus';
import { resolveEventDisplayImage } from '../../utils/eventDisplay';
import { CTSV_CATEGORY_OPTIONS, getCategoryDisplayLabel } from '../../constants/eventCategories';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả', tone: 'all', match: () => true },
  { key: 'approved', label: 'Đã duyệt', tone: 'success', match: (ev) => ['approved', 'live'].includes(ev.statusKey || ev.status) },
  { key: 'pending', label: 'Đang duyệt', tone: 'warning', match: (ev) => /^pending/.test(ev.statusKey || ev.status || '') },
  { key: 'ended', label: 'Đã kết thúc', tone: 'all', match: (ev) => (ev.statusKey || ev.status) === 'ended' },
  { key: 'rejected', label: 'Từ chối', tone: 'alert', match: (ev) => (ev.statusKey || ev.status) === 'rejected' },
];

const cardStateFromEv = (ev) => {
  const s = ev.statusKey || ev.status || '';
  if (s === 'ended') return 'expired';
  if (s === 'postponed') return 'postponed';
  return 'active';
};

const toDiscoveryCard = (ev) => ({
  id: String(ev.id || ev._id || ''),
  title: ev.title,
  thumbnail: ev.image || ev.thumbnail || resolveEventDisplayImage(ev),
  isPending: isPendingApproval(ev),
  category: ev.category || 'Sự kiện',
  categoryLabel: getCategoryDisplayLabel(ev.category) || ev.category,
  dateLabel: ev.date ? `${ev.date}${ev.time ? ' · ' + ev.time : ''}` : '',
  location: ev.location || '',
  filledSlots: Math.max(0, (ev.totalTickets || 0) - (ev.remainingTickets ?? ev.totalTickets ?? 0)),
  totalSlots: ev.totalTickets || ev.capacity || 0,
  cardState: cardStateFromEv(ev),
  primaryLabel: 'Quản lý',
  priceLabel: ev.ticketPrice > 0 ? `${Number(ev.ticketPrice).toLocaleString('vi-VN')}đ` : 'MIỄN PHÍ',
  organizerLabel: 'Đối tác',
});

const CATEGORY_FILTER_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  ...CTSV_CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))
];

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3-3" />
  </svg>
);

const EventCardSkeleton = () => (
  <div className="event-discovery-card event-discovery-card--active" style={{ minHeight: 320 }} aria-hidden>
    <div className="event-discovery-card__media" style={{ background: '#f1f5f9' }} />
    <div className="event-discovery-card__body" style={{ padding: 16 }}>
      <div className="sk sk-line sk-line--lg" />
      <div className="sk sk-line" />
      <div className="sk sk-line sk-line--short" />
    </div>
  </div>
);

const PartnerEventList = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_TABS.forEach((tab) => {
      counts[tab.key] = events.filter(tab.match).length;
    });
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    const tab = STATUS_TABS.find((t) => t.key === statusFilter) || STATUS_TABS[0];
    return events.filter(tab.match);
  }, [events, statusFilter]);

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
          <p>
            Chỉ hiển thị các sự kiện do doanh nghiệp bạn tài trợ hoặc đồng tổ chức — theo dõi trạng thái,
            vé và chi tiết vận hành tại đây.
          </p>
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

      <div className="recommended-header-row partner-events-section-header">
        <div className="recommended-title-container">
          <h2>Sự kiện đối tác</h2>
          <p className="ctsv-home-section-desc">
            Các sự kiện do doanh nghiệp bạn tài trợ hoặc đồng tổ chức cùng FPT University — theo dõi trạng
            thái, vé và chi tiết vận hành tại đây.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="event-grid-cards" aria-busy="true" aria-label="Đang tải sự kiện">
          {Array.from({ length: 6 }, (_, i) => (
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
          <h2>Chưa có sự kiện</h2>
          <p>{statusFilter === 'all' ? 'Gửi đề xuất mới để CTSV xem xét và tạo sự kiện sau khi được phê duyệt.' : 'Không có sự kiện nào ở trạng thái này.'}</p>
          <Link to="/partner/proposals/create" className="ctsv-events-filter-btn">
            Tạo sự kiện mới
          </Link>
        </div>
      ) : (
        <div className="event-grid-cards">
          {filtered.map((ev) => (
            <EventDiscoveryCard
              key={ev.id}
              event={toDiscoveryCard(ev)}
              protectedImage
              viewOnly
              detailTo={`/partner/events/${ev.id}`}
              onPrimaryAction={() => navigate(`/partner/events/${ev.id}`)}
            />
          ))}
        </div>
      )}

      <PartnerCampusEventsSection
        showToast={showToast}
        title="Sự kiện toàn trường"
        description="Các sự kiện campus đang mở đăng ký tại FPT University. Sự kiện do bạn tổ chức hiển thị nút Quản lý thay vì Đăng ký."
        className="partner-campus-section--events-page"
      />
    </div>
  );
};

export default PartnerEventList;
