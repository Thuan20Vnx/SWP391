import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../components/ui/AppSelect';
import HomeHeroSlider from '../components/home/HomeHeroSlider';
import PartnerCampusEventsSection from '../components/partner/PartnerCampusEventsSection';
import {
  fetchPartnerEvents,
  fetchPartnerStats,
} from '../services/partnerApi';
import { fetchPublicEvents } from '../services/eventsApi';
import { getPartnerOwnedEventCardAccess } from '../utils/partnerPublicEventAccess';
import { statusClass } from '../utils/eventStatus';
import { CTSV_CATEGORY_OPTIONS, getCategoryDisplayLabel } from '../constants/eventCategories';
import { filterActiveDiscoveryEvents, mapApiEventToCard } from '../data/eventDiscoveryData';
import { mapEventsToHeroSlides } from '../utils/heroSlides';

const HOME_TIME_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả thời gian' },
  { value: 'Hôm nay', label: 'Hôm nay' },
  { value: 'Tuần này', label: 'Tuần này' }
];

const HOME_CATEGORY_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  ...CTSV_CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))
];

const PartnerEventCard = ({ ev, onOpen }) => {
  const access = getPartnerOwnedEventCardAccess();
  const cap = ev.totalTickets || 0;
  const registered = ev.registeredCount || 0;
  const fillPct = cap > 0 ? Math.round((registered / cap) * 100) : 0;
  const sourceLabel = ev.source === 'school' ? 'Trường' : ev.source === 'partner' ? 'Đối tác' : ev.source === 'icpdp' ? 'IC-PDP' : 'CLB';
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
        <span className="event-card-source-tag">{sourceLabel}</span>
        <div className="event-card-details">
          <div className="detail-row">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden><path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
            <span>{ev.date}</span>
          </div>
          <div className="detail-row">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span className="location-text">{ev.location}</span>
          </div>
        </div>
        <div className="event-card-divider" />
        <div className="event-card-seats">
          <span>{registered}/{cap} chỗ</span>
          <span className="event-card-fill-pct">{fillPct}% đã đăng ký</span>
        </div>
        <div className="event-card-progress-track">
          <div className="event-card-progress-fill" style={{ width: `${fillPct}%` }} />
        </div>
        <div className="event-card-price">
          {ev.ticketPrice > 0 ? `${ev.ticketPrice.toLocaleString('vi-VN')}đ` : 'MIỄN PHÍ'}
        </div>
        <button
          type="button"
          className={`btn-card-register ${access.buttonClass}`}
          onClick={() => onOpen(ev)}
        >
          {access.label}
        </button>
      </div>
    </article>
  );
};

const PartnerHome = ({ showToast }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const searchQuery = outlet.headerSearch ?? '';
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [campusHeroEvents, setCampusHeroEvents] = useState([]);
  const [stats, setStats] = useState([]);
  const [partnership, setPartnership] = useState({
    pendingProposalsCount: 0,
    activeContractsCount: 0,
    ticketRevenueLabel: '0 đ',
  });

  useEffect(() => {
    Promise.all([
      fetchPartnerStats().catch(() => ({ stats: [], partnership: null })),
      fetchPartnerEvents().catch(() => ({ events: [] })),
      fetchPublicEvents({ page: 1, limit: 24, sort: 'featured' }).catch(() => ({ events: [] })),
    ]).then(([statsRes, partnerEventsRes, publicEventsRes]) => {
      const ownEvents = partnerEventsRes.events || [];
      const publicCards = filterActiveDiscoveryEvents((publicEventsRes.events || []).map(mapApiEventToCard));

      setStats(statsRes.stats || []);
      if (statsRes.partnership) {
        setPartnership(statsRes.partnership);
      }
      setEvents(ownEvents);
      setFilteredEvents(ownEvents);
      setCampusHeroEvents(publicCards);
    }).catch(() => {
      setStats([]);
      setEvents([]);
      setFilteredEvents([]);
      setCampusHeroEvents([]);
    });
  }, []);

  const handleFilterSubmit = useCallback((queryOverride) => {
    const activeQuery = typeof queryOverride === 'string' ? queryOverride : searchQuery;
    let result = [...events];
    if (activeQuery.trim()) {
      const q = activeQuery.toLowerCase();
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
    showToast?.(`Đã lọc ${result.length} sự kiện.`, 'success');
  }, [searchQuery, categoryFilter, events, showToast]);

  useEffect(() => {
    outlet.registerHeaderSearchSubmit?.(handleFilterSubmit);
    return () => outlet.registerHeaderSearchSubmit?.(null);
  }, [outlet, handleFilterSubmit]);

  const heroSlides = useMemo(() => {
    const HERO_LIMIT = 3;
    const slideOptions = {
      categoryLabel: (event) => getCategoryDisplayLabel(event.category) || event.category,
      dateLabel: (event) => event.date || event.dateLabel,
      location: (event) => event.location,
    };

    const ownSlides = mapEventsToHeroSlides(events, {
      ...slideOptions,
      limit: HERO_LIMIT,
      organizerLabel: (event) => event.organizerLabel || 'Đối tác của bạn',
    });

    const remainingLimit = HERO_LIMIT - ownSlides.length;
    if (remainingLimit <= 0) return ownSlides;

    const ownEventIds = new Set(events.map((event) => String(event.id)));
    const otherCampusEvents = campusHeroEvents.filter((event) => !ownEventIds.has(String(event.id)));
    const campusSlides = mapEventsToHeroSlides(otherCampusEvents, {
      ...slideOptions,
      limit: remainingLimit,
      organizerLabel: (event) => event.organizerLabel || '',
    });

    return [...ownSlides, ...campusSlides];
  }, [campusHeroEvents, events]);

  const upcomingEvents = useMemo(
    () => filteredEvents.filter((ev) => ev.statusKey === 'approved' || ev.statusKey === 'pending_admin'),
    [filteredEvents]
  );

  const handleOpenEvent = (ev) => {
    navigate(`/partner/events/${ev.id}`);
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
        resolveDetailPath={(slide) => (slide.eventId ? `/partner/events/${slide.eventId}` : null)}
        fallbackCtaPath="/partner/dashboard"
        fallbackCtaMain="Vào bảng điều khiển"
        fallbackCtaSub="Quản lý sự kiện & tài trợ"
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
              <label htmlFor="partner-time-select" className="filter-label">
                Thời gian
              </label>
              <AppSelect
                id="partner-time-select"
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
              <label htmlFor="partner-category-select" className="filter-label">
                Chủ đề
              </label>
              <AppSelect
                id="partner-category-select"
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
            <h2>Sự kiện tài trợ của tôi</h2>
            <p className="ctsv-home-section-desc">
              Các sự kiện do doanh nghiệp bạn tài trợ hoặc đồng tổ chức cùng FPT University.
            </p>
          </div>
          {sectionLink('/partner/events', 'Quản lý sự kiện')}
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="ctsv-home-section-empty">
            <p>Chưa có sự kiện nào phù hợp bộ lọc.</p>
            <button
              type="button"
              className="filter-submit-btn"
              onClick={() => navigate('/partner/proposals/create')}
            >
              Tạo sự kiện mới
            </button>
          </div>
        ) : (
          <div className="event-grid-cards">
            {upcomingEvents.map((ev) => (
              <PartnerEventCard key={ev.id} ev={ev} onOpen={handleOpenEvent} />
            ))}
          </div>
        )}
      </main>

      <PartnerCampusEventsSection
        showToast={showToast}
        title="Khám phá sự kiện campus"
        description="Đăng ký tham gia các sự kiện đang mở tại trường. Sự kiện do bạn tổ chức hiển thị nút Quản lý thay vì Đăng ký."
      />

      <main className="recommended-section ctsv-home-managed-section">
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <h2>Hợp tác & Tài trợ</h2>
            <p className="ctsv-home-section-desc">
              Theo dõi hợp đồng tài trợ, đề xuất sự kiện và báo cáo hiệu suất chiến dịch.
            </p>
          </div>
          {sectionLink('/partner/contracts', 'Xem hợp đồng')}
        </div>

        <div className="event-grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          <article className="ctsv-stat-card" style={{ padding: '24px' }}>
            <p className="ctsv-stat-label">Đề xuất chờ duyệt</p>
            <div className="ctsv-stat-value-row">
              <span className="ctsv-stat-value">{partnership.pendingProposalsCount}</span>
            </div>
            <button
              type="button"
              className="filter-submit-btn"
              style={{ marginTop: '16px', width: '100%' }}
              onClick={() => navigate('/partner/proposals/create')}
            >
              Tạo sự kiện mới
            </button>
          </article>
          <article className="ctsv-stat-card" style={{ padding: '24px' }}>
            <p className="ctsv-stat-label">Hợp đồng đang hiệu lực</p>
            <div className="ctsv-stat-value-row">
              <span className="ctsv-stat-value">{partnership.activeContractsCount}</span>
            </div>
            <button
              type="button"
              className="filter-submit-btn"
              style={{ marginTop: '16px', width: '100%' }}
              onClick={() => navigate('/partner/contracts')}
            >
              Xem hợp đồng
            </button>
          </article>
          <article className="ctsv-stat-card" style={{ padding: '24px' }}>
            <p className="ctsv-stat-label">Doanh thu bán vé</p>
            <div className="ctsv-stat-value-row">
              <span className="ctsv-stat-value">{partnership.ticketRevenueLabel}</span>
            </div>
            <button
              type="button"
              className="filter-submit-btn"
              style={{ marginTop: '16px', width: '100%' }}
              onClick={() => navigate('/partner/analytics')}
            >
              Phân tích báo cáo
            </button>
          </article>
        </div>
      </main>
    </div>
  );
};

export default PartnerHome;
