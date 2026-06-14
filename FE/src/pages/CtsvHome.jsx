import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../components/ui/AppSelect';
import HomeHeroSlider from '../components/home/HomeHeroSlider';
import { fetchCtsvEvents, fetchCtsvStats, MOCK_EVENTS, MOCK_STATS } from '../services/ctsvApi';
import { getCtsvEventAccess, isCtsvManagedEvent, isEventLiveOrOngoing } from '../utils/ctsvEventAccess';
import { statusClass } from '../utils/eventStatus';
import { CTSV_CATEGORY_OPTIONS, getCategoryDisplayLabel } from '../constants/eventCategories';

const HOME_TIME_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả thời gian' },
  { value: 'Hôm nay', label: 'Hôm nay' },
  { value: 'Tuần này', label: 'Tuần này' }
];

const HOME_CATEGORY_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  ...CTSV_CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))
];

const LIVE_OVERVIEW_LIMIT = 8;

const CTSV_HERO_FALLBACK = [
  {
    title: 'FPT Techday 2026: Kiến tạo tương lai số',
    dateLabel: '25 Tháng 10, 2026',
    location: 'Sảnh tòa Gamma',
    categoryLabel: 'Công nghệ',
    organizerLabel: 'CTSV',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80'
  },
  {
    title: 'Đêm Nhạc F-Fest 2026: Bùng cháy sức trẻ',
    dateLabel: '20 Tháng 5, 2026',
    location: 'FPT Plaza 2',
    categoryLabel: 'Âm nhạc',
    organizerLabel: 'CLB',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1280&q=80'
  },
  {
    title: 'FPT Career Expo 2026: Chạm ngõ thành công',
    dateLabel: '28 Tháng 5, 2026',
    location: 'Sân bóng FPTU',
    categoryLabel: 'Kết nối',
    organizerLabel: 'CTSV',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1280&q=80'
  }
];

const CtsvEventCard = ({ ev, onOpen }) => {
  const access = getCtsvEventAccess(ev);
  return (
    <article className="event-card-item">
      <div className="event-card-image-wrapper">
        <img src={ev.image} alt={ev.title} className="event-card-img" />
        <span className="event-card-category-badge">
          {getCategoryDisplayLabel(ev.category) || ev.category}
        </span>
      </div>
      <div className="event-card-body">
        <h3 className="event-card-title">{ev.title}</h3>
        <div className="event-card-details">
          <div className="detail-row">
            <span>
              {ev.date} • {ev.time}
            </span>
          </div>
          <div className="detail-row">
            <span className="location-text">{ev.location}</span>
          </div>
        </div>
        <div className="event-card-divider" />
        <div className="event-card-footer">
          <div className="ticket-info">
            <span className="ticket-remain-text">
              Còn: {ev.remainingTickets}/{ev.totalTickets}
            </span>
            <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>{ev.status}</span>
          </div>
          <button
            type="button"
            className={`btn-card-register ${access.buttonClass}`}
            onClick={() => onOpen(ev)}
          >
            {access.label}
          </button>
        </div>
      </div>
    </article>
  );
};

const CtsvHome = ({ showToast }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const searchQuery = outlet.headerSearch ?? '';
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');

  const [events, setEvents] = useState(MOCK_EVENTS);
  const [filteredEvents, setFilteredEvents] = useState(MOCK_EVENTS);
  const [stats, setStats] = useState(MOCK_STATS);

  useEffect(() => {
    fetchCtsvStats()
      .then((d) => setStats(d.stats || MOCK_STATS))
      .catch(() => setStats(MOCK_STATS));

    fetchCtsvEvents()
      .then((d) => {
        const list = d.events?.length ? d.events : MOCK_EVENTS;
        setEvents(list);
        setFilteredEvents(list);
      })
      .catch(() => {
        setEvents(MOCK_EVENTS);
        setFilteredEvents(MOCK_EVENTS);
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
    const featured = events.slice(0, 3);
    if (!featured.length) {
      return CTSV_HERO_FALLBACK.map((slide) => ({ ...slide, eventId: null }));
    }
    return featured.map((ev) => ({
      title: ev.title,
      dateLabel: ev.date,
      location: ev.location,
      categoryLabel: getCategoryDisplayLabel(ev.category) || ev.category,
      organizerLabel: ev.organizerLabel || 'CTSV',
      image: ev.image,
      eventId: ev.id
    }));
  }, [events]);

  const liveOverviewEvents = useMemo(
    () => events.filter(isEventLiveOrOngoing).slice(0, LIVE_OVERVIEW_LIMIT),
    [events]
  );

  const managedEvents = useMemo(
    () => filteredEvents.filter(isCtsvManagedEvent),
    [filteredEvents]
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
          <div className="event-grid-cards">
            {liveOverviewEvents.map((ev) => (
              <CtsvEventCard key={`live-${ev.id}`} ev={ev} onOpen={handleOpenEvent} />
            ))}
          </div>
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
          <div className="event-grid-cards">
            {managedEvents.map((ev) => (
              <CtsvEventCard key={ev.id} ev={ev} onOpen={handleOpenEvent} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CtsvHome;
