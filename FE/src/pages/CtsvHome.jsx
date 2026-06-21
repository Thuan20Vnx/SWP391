import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../components/ui/AppSelect';
import HomeHeroSlider from '../components/home/HomeHeroSlider';
import { fetchCtsvEvents, fetchCtsvStats } from '../services/ctsvApi';
import { isCtsvManagedEvent, isEventLiveOrOngoing } from '../utils/ctsvEventAccess';
import { CTSV_CATEGORY_OPTIONS, getCategoryDisplayLabel } from '../constants/eventCategories';
import EventDiscoveryCard from '../components/EventDiscoveryCard';
import { mapEventsToHeroSlides } from '../utils/heroSlides';

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
  dateLabel: ev.date || ev.dateLabel || '',
  location: ev.location || '',
  filledSlots: ev.registeredCount ?? 0,
  totalSlots: ev.totalTickets || ev.capacity || 0,
  cardState: cardStateFromEv(ev),
  primaryLabel: 'Xem chi tiết',
  priceLabel: ev.ticketPrice > 0 ? `${Number(ev.ticketPrice).toLocaleString('vi-VN')}đ` : 'MIỄN PHÍ',
  organizerLabel: ev.source === 'school' ? 'Trường' : ev.source === 'partner' ? 'Đối tác' : ev.source === 'icpdp' ? 'IC-PDP' : 'CLB',
});

const HOME_TIME_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả thời gian' },
  { value: 'Hôm nay', label: 'Hôm nay' },
  { value: 'Tuần này', label: 'Tuần này' }
];

const HOME_CATEGORY_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  ...CTSV_CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))
];

const PAGE_SIZE = 6;

const SectionPager = ({ page, total, onChange }) => {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="ctsv-section-pager">
      <button
        type="button"
        className="ctsv-pager-btn"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        Trước
      </button>
      <span className="ctsv-pager-label">Trang {page} / {totalPages}</span>
      <button
        type="button"
        className="ctsv-pager-btn"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </button>
    </div>
  );
};

const CtsvHome = ({ showToast }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const searchQuery = outlet.headerSearch ?? '';
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [stats, setStats] = useState([]);
  const [livePage, setLivePage] = useState(1);
  const [managedPage, setManagedPage] = useState(1);

  useEffect(() => {
    fetchCtsvStats()
      .then((d) => setStats(d.stats || []))
      .catch(() => setStats([]));

    fetchCtsvEvents()
      .then((d) => {
        const list = d.events || [];
        setEvents(list);
        setFilteredEvents(list);
      })
      .catch(() => {
        setEvents([]);
        setFilteredEvents([]);
      });
  }, []);

  const handleFilterSubmit = useCallback(() => {
    fetchCtsvEvents({
      q: searchQuery,
      category: categoryFilter,
      time: timeFilter
    })
      .then((d) => {
        const list = d.events || [];
        setFilteredEvents(list);
        setEvents(list);
        setLivePage(1);
        setManagedPage(1);
        showToast(`Đã lọc ${list.length} sự kiện.`, 'success');
      })
      .catch(() => {
        let result = [...events];
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          result = result.filter(
            (ev) =>
              ev.title.toLowerCase().includes(q) ||
              ev.location.toLowerCase().includes(q) ||
              ev.category.toLowerCase().includes(q)
          );
        }
        if (categoryFilter !== 'Tất cả') {
          result = result.filter((ev) => ev.category === categoryFilter);
        }
        setFilteredEvents(result);
        showToast(`Đã lọc ${result.length} sự kiện (offline).`, 'info');
      });
  }, [searchQuery, categoryFilter, timeFilter, events, showToast]);

  useEffect(() => {
    outlet.registerHeaderSearchSubmit?.(handleFilterSubmit);
    return () => outlet.registerHeaderSearchSubmit?.(null);
  }, [outlet, handleFilterSubmit]);

  const heroSlides = useMemo(() => {
    return mapEventsToHeroSlides(events, {
      categoryLabel: (event) => getCategoryDisplayLabel(event.category) || event.category,
      organizerLabel: (event) => event.organizerLabel || 'CTSV',
      dateLabel: (event) => event.date,
      location: (event) => event.location,
    });
  }, [events]);

  const allLiveEvents = useMemo(() => events.filter(isEventLiveOrOngoing), [events]);
  const liveOverviewEvents = useMemo(
    () => allLiveEvents.slice((livePage - 1) * PAGE_SIZE, livePage * PAGE_SIZE),
    [allLiveEvents, livePage]
  );

  const allManagedEvents = useMemo(() => filteredEvents.filter(isCtsvManagedEvent), [filteredEvents]);
  const managedEvents = useMemo(
    () => allManagedEvents.slice((managedPage - 1) * PAGE_SIZE, managedPage * PAGE_SIZE),
    [allManagedEvents, managedPage]
  );

  const handleOpenEvent = (ev) => {
    navigate(`/ctsv/events/${ev.id}`);
  };

  const sectionLink = (path, label) => (
    <a
      href={path}
      className="see-all-link"
      onClick={(e) => {
        e.preventDefault();
        navigate(path);
      }}
    >
      <span>{label}</span>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
      </svg>
    </a>
  );

  return (
    <div className="portal-home-hero-layout">
      <HomeHeroSlider
        slides={heroSlides}
        resolveDetailPath={(slide) => (slide.eventId ? `/ctsv/events/${slide.eventId}` : null)}
        fallbackCtaPath="/ctsv/dashboard"
        fallbackCtaMain="Vào bảng điều khiển"
        fallbackCtaSub="Quản lý sự kiện campus"
      />

      <section className="filter-bar-section">
        <div className="filter-bar-card">
          <div className="filter-group">
            <span className="filter-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="currentColor" />
              </svg>
            </span>
            <div className="filter-control">
              <label htmlFor="ctsv-time-select" className="filter-label">
                Thời gian
              </label>
              <AppSelect
                id="ctsv-time-select"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                variant="filter"
                options={HOME_TIME_FILTERS}
              />
            </div>
          </div>
          <div className="filter-divider-line" />
          <div className="filter-group">
            <span className="filter-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" fill="currentColor" />
              </svg>
            </span>
            <div className="filter-control">
              <label htmlFor="ctsv-category-select" className="filter-label">
                Chủ đề
              </label>
              <AppSelect
                id="ctsv-category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                variant="filter"
                options={HOME_CATEGORY_FILTERS}
              />
            </div>
          </div>
          <button type="button" className="filter-submit-btn" onClick={handleFilterSubmit}>
            Lọc kết quả
          </button>
        </div>
      </section>

      <section className="ctsv-stats-section">
        <div className="ctsv-stats-grid">
          {stats.map((item) => (
            <article key={item.label} className="ctsv-stat-card">
              <p className="ctsv-stat-label">{item.label}</p>
              <div className="ctsv-stat-value-row">
                <span className="ctsv-stat-value">{item.value}</span>
                <span className="ctsv-stat-trend">{item.trend}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <main className="recommended-section ctsv-home-live-section">
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <h2>Tất cả sự kiện đang diễn ra</h2>
            <p className="ctsv-home-section-desc">
              Tổng quan sự kiện đang mở đăng ký hoặc đang diễn ra trên toàn hệ thống (CLB, trường, đối tác).
            </p>
          </div>
          {sectionLink('/ctsv/events', 'Xem tất cả')}
        </div>

        {liveOverviewEvents.length === 0 ? (
          <div className="ctsv-home-section-empty">
            <p>Hiện không có sự kiện nào đang diễn ra hoặc mở đăng ký.</p>
          </div>
        ) : (
          <>
            <div className="event-grid-cards">
              {liveOverviewEvents.map((ev) => (
                <EventDiscoveryCard
                  key={`live-${ev.id}`}
                  event={toDiscoveryCard(ev)}
                  viewOnly
                  onManage={isCtsvManagedEvent(ev) ? () => handleOpenEvent(ev) : undefined}
                  manageLabel="Quản lý"
                  onPrimaryAction={() => handleOpenEvent(ev)}
                />
              ))}
            </div>
            <SectionPager page={livePage} total={allLiveEvents.length} onChange={setLivePage} />
          </>
        )}
      </main>

      <main className="recommended-section ctsv-home-managed-section">
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <h2>Sự kiện đang quản lý</h2>
            <p className="ctsv-home-section-desc">
              Sự kiện cấp trường do CTSV tạo và phê duyệt — bạn có thể quản lý trực tiếp.
            </p>
          </div>
          {sectionLink('/ctsv/events', 'Quản lý sự kiện')}
        </div>

        {managedEvents.length === 0 ? (
          <div className="ctsv-home-section-empty">
            <p>Chưa có sự kiện cấp trường nào phù hợp bộ lọc.</p>
            <button
              type="button"
              className="filter-submit-btn"
              onClick={() => navigate('/ctsv/events/create')}
            >
              Tạo sự kiện trường
            </button>
          </div>
        ) : (
          <>
            <div className="event-grid-cards">
              {managedEvents.map((ev) => (
                <EventDiscoveryCard
                  key={ev.id}
                  event={toDiscoveryCard(ev)}
                  viewOnly
                  onManage={() => handleOpenEvent(ev)}
                  manageLabel="Quản lý"
                  onPrimaryAction={() => handleOpenEvent(ev)}
                />
              ))}
            </div>
            <SectionPager page={managedPage} total={allManagedEvents.length} onChange={setManagedPage} />
          </>
        )}
      </main>
    </div>
  );
};

export default CtsvHome;
