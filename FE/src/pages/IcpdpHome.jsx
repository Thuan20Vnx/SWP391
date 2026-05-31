import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../components/ui/AppSelect';
import { fetchIcpdpEvents, fetchIcpdpStats, ICPDP_MOCK_EVENTS, ICPDP_MOCK_STATS } from '../services/icpdpApi';
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

  const sliderData = [
    {
      tag: 'QUẢN LÝ CLB',
      title: 'Duyệt đề xuất sự kiện\ntừ các Câu lạc bộ',
      desc: 'Thẩm định, phê duyệt nội bộ các đề xuất sự kiện từ CLB trước khi chuyển CTSV xét duyệt cuối.',
      image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1280&q=80'
    },
    {
      tag: 'GIÁM SÁT',
      title: 'Theo dõi hoạt động\ncác Câu lạc bộ',
      desc: 'Giám sát sự kiện đang diễn ra, lịch tổ chức và hiệu suất hoạt động của từng CLB.',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1280&q=80'
    },
    {
      tag: 'BÁO CÁO',
      title: 'Nghiệm thu báo cáo\nsau sự kiện',
      desc: 'Tiếp nhận, đánh giá báo cáo kết quả từ các CLB để tính điểm hoạt động.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1280&q=80'
    }
  ];

  const [events, setEvents] = useState(ICPDP_MOCK_EVENTS);
  const [filteredEvents, setFilteredEvents] = useState(ICPDP_MOCK_EVENTS);
  const [stats, setStats] = useState(ICPDP_MOCK_STATS);

  useEffect(() => {
    fetchIcpdpStats()
      .then((d) => setStats(d.stats || ICPDP_MOCK_STATS))
      .catch(() => setStats(ICPDP_MOCK_STATS));

    fetchIcpdpEvents()
      .then((d) => {
        const list = d.events?.length ? d.events : ICPDP_MOCK_EVENTS;
        setEvents(list);
        setFilteredEvents(list);
      })
      .catch(() => {
        setEvents(ICPDP_MOCK_EVENTS);
        setFilteredEvents(ICPDP_MOCK_EVENTS);
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliderData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [sliderData.length]);

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
              <button type="button" className="hero-cta-btn" onClick={() => navigate('/icpdp/dashboard')}>
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
    </>
  );
};

export default IcpdpHome;
