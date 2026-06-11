import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../components/ui/AppSelect';
import { fetchIcpdpEvents, fetchIcpdpStats, ICPDP_MOCK_STATS } from '../services/icpdpApi';
import { getCtsvEventAccess, isEventLiveOrOngoing } from '../utils/ctsvEventAccess';
import { statusClass } from '../utils/eventStatus';

const HOME_TIME_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả thời gian' },
  { value: 'Hôm nay', label: 'Hôm nay' },
  { value: 'Tuần này', label: 'Tuần này' }
];

const HOME_CATEGORY_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  { value: 'Âm nhạc', label: 'Âm nhạc' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Công nghệ', label: 'Công nghệ' },
  { value: 'Kết nối', label: 'Kết nối' }
];

const LIVE_OVERVIEW_LIMIT = 8;
const HERO_AUTOPLAY_MS = 6000;

const IcpdpEventCard = ({ ev, onOpen }) => {
  const access = getCtsvEventAccess(ev);
  return (
    <article className="event-card-item">
      <div className="event-card-image-wrapper">
        <img src={ev.image} alt={ev.title} className="event-card-img" />
        <span className="event-card-category-badge">{ev.category}</span>
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
            className="btn-card-register"
            onClick={() => onOpen(ev)}
          >
            Xem chi tiết
          </button>
        </div>
      </div>
    </article>
  );
};

const IcpdpHome = ({ showToast }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const searchQuery = outlet.headerSearch ?? '';
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroAutoplayKey, setHeroAutoplayKey] = useState(0);

  const sliderData = [
    {
      tag: 'QUẢN LÝ CLB',
      title: 'Duyệt đề xuất sự kiện\ntừ các Câu lạc bộ',
      dateLabel: 'Quy trình duyệt nội bộ',
      location: 'Đề xuất từ các Câu lạc bộ',
      categoryLabel: 'Đề xuất CLB',
      organizerLabel: 'IC-PDP',
      ctaMain: 'Vào bảng điều khiển',
      ctaSub: 'Theo dõi hồ sơ cần xử lý',
      ctaPath: '/icpdp/dashboard',
      image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1280&q=80'
    },
    {
      tag: 'GIÁM SÁT',
      title: 'Theo dõi hoạt động\ncác Câu lạc bộ',
      dateLabel: 'Sự kiện đang diễn ra',
      location: 'Lịch toàn trường và hoạt động CLB',
      categoryLabel: 'Giám sát',
      organizerLabel: 'Toàn hệ thống',
      ctaMain: 'Xem sự kiện',
      ctaSub: 'Mở danh sách sự kiện IC-PDP',
      ctaPath: '/icpdp/events',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1280&q=80'
    },
    {
      tag: 'BÁO CÁO',
      title: 'Nghiệm thu báo cáo\nsau sự kiện',
      dateLabel: 'Báo cáo sau sự kiện',
      location: 'Đánh giá kết quả và điểm hoạt động',
      categoryLabel: 'Báo cáo',
      organizerLabel: 'CLB',
      ctaMain: 'Xem báo cáo',
      ctaSub: 'Tổng hợp hiệu suất sau sự kiện',
      ctaPath: '/icpdp/reports',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1280&q=80'
    }
  ];

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [stats, setStats] = useState(ICPDP_MOCK_STATS);

  useEffect(() => {
    fetchIcpdpStats()
      .then((d) => setStats(d.stats || ICPDP_MOCK_STATS))
      .catch(() => setStats(ICPDP_MOCK_STATS));

    fetchIcpdpEvents()
      .then((d) => {
        const list = d.events || [];
        setEvents(list);
        setFilteredEvents(list);
      })
      .catch(() => {
        setEvents([]);
        setFilteredEvents([]);
        showToast?.('Không tải được sự kiện — kiểm tra backend và đăng nhập lại.', 'error');
      });
  }, []);

  useEffect(() => {
    if (sliderData.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliderData.length);
    }, HERO_AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [sliderData.length, heroAutoplayKey]);

  const resetHeroAutoplay = useCallback(() => {
    setHeroAutoplayKey((k) => k + 1);
  }, []);

  const slideCount = sliderData.length;

  const goToPrevSlide = () => {
    if (slideCount <= 1) return;
    setActiveSlide((prev) => (prev - 1 + slideCount) % slideCount);
    resetHeroAutoplay();
  };

  const goToNextSlide = () => {
    if (slideCount <= 1) return;
    setActiveSlide((prev) => (prev + 1) % slideCount);
    resetHeroAutoplay();
  };

  const goToSlide = (index) => {
    setActiveSlide(index);
    resetHeroAutoplay();
  };

  const handleFilterSubmit = useCallback(() => {
    fetchIcpdpEvents({
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

  const clubEvents = useMemo(
    () => filteredEvents.filter((ev) => ev.source === 'club'),
    [filteredEvents]
  );

  const handleOpenEvent = (ev) => {
    navigate(`/icpdp/events/${ev.id}`);
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
    <div className="icpdp-home-layout home-layout">
      <section className={`hero-banner-slider${slideCount > 1 ? ' hero-banner-slider--nav' : ''}`}>
        {sliderData.map((slide, index) => (
          <div
            key={index}
            className={`hero-slide ${index === activeSlide ? 'active' : ''}`}
            style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.7)), url(${slide.image})` }}
          >
            <div className="hero-content-container">
              <div className="hero-top-row">
                <span className="hero-tag-badge">{slide.tag}</span>
                {slide.categoryLabel && (
                  <span className="hero-category-pill">{slide.categoryLabel}</span>
                )}
                {slide.organizerLabel && (
                  <span className="hero-organizer-pill">{slide.organizerLabel}</span>
                )}
              </div>
              <h1 className="hero-title">{slide.title}</h1>
              <ul className="hero-meta-list">
                {slide.dateLabel && (
                  <li className="hero-meta-item">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
                      />
                    </svg>
                    <span>{slide.dateLabel}</span>
                  </li>
                )}
                {slide.location && (
                  <li className="hero-meta-item">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                      />
                    </svg>
                    <span>{slide.location}</span>
                  </li>
                )}
              </ul>
              <button type="button" className="hero-cta-btn" onClick={() => navigate(slide.ctaPath)}>
                <span className="hero-cta-btn__main">{slide.ctaMain}</span>
                <span className="hero-cta-btn__sub">{slide.ctaSub}</span>
              </button>
            </div>
          </div>
        ))}
        {slideCount > 1 && (
          <>
            <button
              type="button"
              className="hero-slider-arrow hero-slider-arrow--prev"
              onClick={goToPrevSlide}
              aria-label="Slide IC-PDP trước"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="hero-slider-arrow hero-slider-arrow--next"
              onClick={goToNextSlide}
              aria-label="Slide IC-PDP tiếp theo"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </>
        )}
        <div className="hero-dot-indicators">
          {sliderData.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`slider-dot ${index === activeSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="filter-bar-section">
        <div className="filter-bar-card">
          <div className="filter-group">
            <span className="filter-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" fill="currentColor" />
              </svg>
            </span>
            <div className="filter-control">
              <label htmlFor="icpdp-time-select" className="filter-label">
                Thời gian
              </label>
              <AppSelect
                id="icpdp-time-select"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                variant="filter"
                options={HOME_TIME_FILTERS}
              />
            </div>
          </div>
          <div className="filter-divider-line" />
          <div className="filter-group">
            <span className="filter-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M12 2a7 7 0 0 0-7 7c0 1.92.78 3.66 2.04 4.92L12 22l4.96-8.08A6.98 6.98 0 0 0 12 2zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" fill="currentColor" />
              </svg>
            </span>
            <div className="filter-control">
              <label htmlFor="icpdp-category-select" className="filter-label">
                Chủ đề
              </label>
              <AppSelect
                id="icpdp-category-select"
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
            <h2>Sự kiện đang diễn ra</h2>
            <p className="ctsv-home-section-desc">
              Tổng quan sự kiện đang mở đăng ký hoặc đang diễn ra trên toàn hệ thống.
            </p>
          </div>
          {sectionLink('/icpdp/events', 'Xem tất cả')}
        </div>

        {liveOverviewEvents.length === 0 ? (
          <div className="ctsv-home-section-empty">
            <p>Hiện không có sự kiện nào đang diễn ra hoặc mở đăng ký.</p>
          </div>
        ) : (
          <div className="event-grid-cards">
            {liveOverviewEvents.map((ev) => (
              <IcpdpEventCard key={`live-${ev.id}`} ev={ev} onOpen={handleOpenEvent} />
            ))}
          </div>
        )}
      </main>

      <main className="recommended-section ctsv-home-managed-section">
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <h2>Sự kiện CLB</h2>
            <p className="ctsv-home-section-desc">
              Sự kiện do các Câu lạc bộ tổ chức — IC-PDP giám sát và duyệt đề xuất.
            </p>
          </div>
          {sectionLink('/icpdp/proposals', 'Duyệt đề xuất CLB')}
        </div>

        {clubEvents.length === 0 ? (
          <div className="ctsv-home-section-empty">
            <p>Chưa có sự kiện CLB nào phù hợp bộ lọc.</p>
            <button
              type="button"
              className="filter-submit-btn"
              onClick={() => navigate('/icpdp/proposals')}
            >
              Xem đề xuất CLB
            </button>
          </div>
        ) : (
          <div className="event-grid-cards">
            {clubEvents.map((ev) => (
              <IcpdpEventCard key={ev.id} ev={ev} onOpen={handleOpenEvent} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default IcpdpHome;
