import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../components/ui/AppSelect';
import {
  fetchPartnerEvents,
  fetchPartnerStats,
  PARTNER_MOCK_EVENTS,
  PARTNER_MOCK_STATS
} from '../services/partnerApi';
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

const PartnerEventCard = ({ ev, onOpen }) => (
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
        <button type="button" className="btn-card-register btn-card-register--primary" onClick={() => onOpen(ev)}>
          Chi tiết
        </button>
      </div>
    </div>
  </article>
);

const PartnerHome = ({ showToast }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const searchQuery = outlet.headerSearch ?? '';
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [activeSlide, setActiveSlide] = useState(0);

  const sliderData = [
    {
      tag: 'TÀI TRỢ & HỢP TÁC',
      title: 'Tech Talk 2026:\nKết nối nhân tài FPT',
      desc: 'Đồng hành cùng FPT University tổ chức sự kiện công nghệ, tiếp cận sinh viên IT và mở rộng thương hiệu doanh nghiệp.',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1280&q=80'
    },
    {
      tag: 'TUYỂN DỤNG',
      title: 'FPT Recruitment Day:\nGặp gỡ ứng viên tiềm năng',
      desc: 'Quản lý đăng ký, theo dõi lượt tham dự và đánh giá hiệu quả tuyển dụng trực tiếp tại campus.',
      image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1280&q=80'
    },
    {
      tag: 'BÁO CÁO',
      title: 'Phân tích hiệu suất:\nDoanh thu tài trợ & ROI',
      desc: 'Theo dõi doanh thu tài trợ, tỷ lệ check-in và báo cáo định kỳ cho từng chiến dịch sự kiện.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1280&q=80'
    }
  ];

  const [events, setEvents] = useState(PARTNER_MOCK_EVENTS);
  const [filteredEvents, setFilteredEvents] = useState(PARTNER_MOCK_EVENTS);
  const [stats, setStats] = useState(PARTNER_MOCK_STATS);

  useEffect(() => {
    fetchPartnerStats()
      .then((d) => setStats(d.stats || PARTNER_MOCK_STATS))
      .catch(() => setStats(PARTNER_MOCK_STATS));

    fetchPartnerEvents()
      .then((d) => {
        const list = d.events?.length ? d.events : PARTNER_MOCK_EVENTS;
        setEvents(list);
        setFilteredEvents(list);
      })
      .catch(() => {
        setEvents(PARTNER_MOCK_EVENTS);
        setFilteredEvents(PARTNER_MOCK_EVENTS);
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliderData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [sliderData.length]);

  const handleFilterSubmit = useCallback(() => {
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
    showToast?.(`Đã lọc ${result.length} sự kiện.`, 'success');
  }, [searchQuery, categoryFilter, events, showToast]);

  useEffect(() => {
    outlet.registerHeaderSearchSubmit?.(handleFilterSubmit);
    return () => outlet.registerHeaderSearchSubmit?.(null);
  }, [outlet, handleFilterSubmit]);

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
              <button type="button" className="hero-cta-btn" onClick={() => navigate('/partner/dashboard')}>
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

      <main className="recommended-section ctsv-home-live-section">
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <h2>Sự kiện đang tổ chức</h2>
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
              <span className="ctsv-stat-value">1</span>
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
              <span className="ctsv-stat-value">3</span>
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
            <p className="ctsv-stat-label">Doanh thu tài trợ</p>
            <div className="ctsv-stat-value-row">
              <span className="ctsv-stat-value">150M</span>
              <span className="ctsv-stat-trend">VNĐ</span>
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
    </>
  );
};

export default PartnerHome;
