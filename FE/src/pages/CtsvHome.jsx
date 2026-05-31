import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../components/ui/AppSelect';
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
  const [activeSlide, setActiveSlide] = useState(0);

  const sliderData = [
    {
      tag: 'QUẢN LÝ SỰ KIỆN',
      title: 'FPT Techday 2026:\nKiến tạo tương lai số',
      desc: 'Theo dõi, phê duyệt và điều phối sự kiện công nghệ lớn nhất trong năm tại campus Đà Nẵng.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80'
    },
    {
      tag: 'PHÊ DUYỆT',
      title: 'Đêm Nhạc F-Fest 2026:\nĐiều phối an toàn',
      desc: 'Kiểm tra hồ sơ đăng ký, phân bổ vé và giám sát logistik cho sự kiện âm nhạc quy mô lớn.',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1280&q=80'
    },
    {
      tag: 'BÁO CÁO',
      title: 'Career Expo 2026:\nTổng hợp dữ liệu',
      desc: 'Xem thống kê đăng ký, doanh thu dự kiến và báo cáo tham dự theo thời gian thực.',
      image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1280&q=80'
    }
  ];

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

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliderData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [sliderData.length]);

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
    <>
      <section className="hero-banner-slider">
        {sliderData.map((slide, index) => (
          <div
            key={index}
            className={`hero-slide ${index === activeSlide ? 'active' : ''}`}
            style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.72)), url(${slide.image})` }}
          >
            <div className="hero-content-container">
              <span className="hero-tag-badge">{slide.tag}</span>
              <h1 className="hero-title">{slide.title}</h1>
              <p className="hero-description">{slide.desc}</p>
              <button type="button" className="hero-cta-btn" onClick={() => navigate('/ctsv/dashboard')}>
                Vào bảng điều khiển
              </button>
            </div>
          </div>
        ))}
        <div className="hero-dot-indicators">
          {sliderData.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`slider-dot ${index === activeSlide ? 'active' : ''}`}
              onClick={() => setActiveSlide(index)}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
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

      <section className="filter-bar-section">
        <div className="filter-bar-card">
          <div className="filter-group">
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
    </>
  );
};

export default CtsvHome;
