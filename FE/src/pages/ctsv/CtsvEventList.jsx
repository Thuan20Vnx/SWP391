import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { isAdminRole } from '../../utils/auth';
import AppSelect from '../../components/ui/AppSelect';
import { fetchCtsvEvents } from '../../services/ctsvApi';
import { getCtsvEventAccess, isCtsvManagedEvent } from '../../utils/ctsvEventAccess';
import { isPendingApproval } from '../../utils/eventStatus';
import { CTSV_CATEGORY_OPTIONS, getCategoryDisplayLabel } from '../../constants/eventCategories';
import EventDiscoveryCard from '../../components/EventDiscoveryCard';

const TIME_FILTER_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả thời gian' },
  { value: 'Hôm nay', label: 'Hôm nay' },
  { value: 'Tuần này', label: 'Tuần này' }
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  ...CTSV_CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))
];

const PAGE_SIZE = 6;

const STATE_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'needs_approval', label: 'Cần duyệt' },
];

const needsCtsvApproval = (ev) => getCtsvEventAccess(ev).canManage && isPendingApproval(ev);

const cardStateFromEv = (ev) => {
  const s = ev.statusKey || ev.status || '';
  if (s === 'ended') return 'expired';
  if (s === 'postponed') return 'postponed';
  return 'active';
};

const toDiscoveryCard = (ev) => ({
  id: String(ev._id || ev.id || ''),
  title: ev.title,
  thumbnail: ev.image || ev.thumbnail || ev.flyer || '',
  category: ev.category || 'Sự kiện',
  categoryLabel: getCategoryDisplayLabel(ev.category) || ev.category,
  dateLabel: ev.date ? `${ev.date}${ev.time ? ' ' + ev.time : ''}` : '',
  location: ev.location || '',
  filledSlots: ev.registeredCount ?? 0,
  totalSlots: ev.totalTickets || ev.capacity || 0,
  cardState: cardStateFromEv(ev),
  primaryLabel: isCtsvManagedEvent(ev) ? 'Quản lý' : 'Xem chi tiết',
  priceLabel: ev.ticketPrice > 0 ? `${Number(ev.ticketPrice).toLocaleString('vi-VN')}đ` : 'MIỄN PHÍ',
  organizerLabel: ev.source === 'school' ? 'Trường' : ev.source === 'partner' ? 'Đối tác' : 'CLB',
});

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

const CtsvEventList = () => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const basePath = isAdminRole() ? '/admin/ctsv' : '/ctsv';
  const { showToast, headerSearch = '', registerHeaderSearchSubmit } = outlet;

  const [events, setEvents] = useState([]);
  const [localSearch, setLocalSearch] = useState('');
  const searchQuery = headerSearch.trim() || localSearch.trim();
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [stateFilter, setStateFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

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
          setPage(1);
          return list;
        })
        .catch((err) => {
          setEvents([]);
          setPage(1);
          const msg =
            err?.status === 401
              ? 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.'
              : 'Không thể tải danh sách sự kiện.';
          showToast?.(msg, 'error');
          return [];
        })
        .finally(() => setLoading(false));
    },
    [searchQuery, categoryFilter, timeFilter, showToast]
  );

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    registerHeaderSearchSubmit?.(() => {});
    return () => registerHeaderSearchSubmit?.(null);
  }, [registerHeaderSearchSubmit]);

  const managedCount = useMemo(
    () => events.filter((ev) => getCtsvEventAccess(ev).canManage).length,
    [events]
  );

  const managedPendingCount = useMemo(
    () => events.filter(needsCtsvApproval).length,
    [events]
  );

  const filtered = useMemo(() => {
    setPage(1);
    const q = searchQuery.toLowerCase();
    let result = events;
    if (q) {
      result = result.filter(
        (ev) =>
          (ev.title || '').toLowerCase().includes(q) ||
          (ev.location || '').toLowerCase().includes(q)
      );
    }
    if (stateFilter === 'needs_approval') {
      result = result.filter(needsCtsvApproval);
    }
    return result;
  }, [events, searchQuery, stateFilter]);

  const pagedEvents = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
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
          <p>Phê duyệt sự kiện cấp trường; sự kiện CLB và đối tác chỉ xem thông tin (ICPDP quản lý CLB).</p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">Sự kiện trong danh sách</span>
          </div>
          <button type="button" className="ctsv-events-hero-cta" onClick={() => navigate(`${basePath}/events/create`)}>
            Tạo sự kiện cấp trường
          </button>
        </div>
      </header>

      <section className="ctsv-events-filter-card">
        <div className="events-page__state-filters" role="group" aria-label="Trạng thái">
          {STATE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`events-page__state-pill ${stateFilter === filter.value ? 'is-active' : ''}`}
              onClick={() => setStateFilter(filter.value)}
            >
              {filter.label}
              {filter.value === 'needs_approval' && managedPendingCount > 0 ? ` (${managedPendingCount})` : ''}
            </button>
          ))}
        </div>
        <form className="ctsv-events-filter-form" onSubmit={handleFilter}>
          <label className="ctsv-events-search">
            <span className="ctsv-events-search-icon"><IconSearch /></span>
            <input
              type="search"
              placeholder="Tìm kiếm theo tên, địa điểm, danh mục..."
              value={headerSearch || localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="ctsv-events-search-input"
            />
          </label>
          <div className="ctsv-events-filter-selects">
            <AppSelect value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} options={TIME_FILTER_OPTIONS} fullWidth={false} />
            <AppSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={CATEGORY_FILTER_OPTIONS} fullWidth={false} />
          </div>
          <button type="submit" className="ctsv-events-filter-btn" disabled={loading}>
            {loading ? 'Đang lọc...' : 'Lọc kết quả'}
          </button>
        </form>
        {!loading && (
          <p className="ctsv-events-filter-summary">
            <strong>{filtered.length}</strong> sự kiện
            {managedCount > 0 && (
              <> · <span className="ctsv-events-filter-summary-manage">{managedCount} cần quản lý / phê duyệt</span></>
            )}
          </p>
        )}
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
          <p>Thử đổi từ khóa hoặc bộ lọc thời gian, chủ đề.</p>
          <button type="button" className="ctsv-events-filter-btn" onClick={() => loadEvents()}>
            Tải lại
          </button>
        </div>
      ) : (
        <>
          <div className="event-grid-cards">
            {pagedEvents.map((ev) => (
              <EventDiscoveryCard
                key={ev.id}
                event={toDiscoveryCard(ev)}
                viewOnly
                onManage={isCtsvManagedEvent(ev) ? () => navigate(`${basePath}/events/${ev.id}`) : undefined}
                manageLabel="Quản lý"
                onPrimaryAction={() => navigate(`${basePath}/events/${ev.id}`)}
              />
            ))}
          </div>
          <SectionPager page={page} total={filtered.length} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default CtsvEventList;
