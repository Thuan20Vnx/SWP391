import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ChatbotFloating from '../components/ChatbotFloating';
import PublicAdminShell from '../layouts/PublicAdminShell';
import SiteFooter from '../components/SiteFooter';
import { API_BASE, getAuthHeaders } from '../utils/api';
import useUserProfile from '../hooks/useUserProfile';
import { mapApiEventToHomeCard, filterActiveDiscoveryEvents } from '../data/eventDiscoveryData';

const Home = ({ showToast }) => {
  const navigate = useNavigate();
  const { isLoggedIn, userProfile } = useUserProfile();

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');

  // Active Hero Slider Index
  const [activeSlide, setActiveSlide] = useState(0);

  // Event Data State — loaded from API
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [filteredEvents, setFilteredEvents] = useState([]);

  // Hero Slider Data
  const sliderData = [
    {
      title: 'FPT Techday 2026:\nKiến tạo tương lai số',
      desc: 'Tham gia sự kiện công nghệ lớn nhất trong năm để khám phá những đột phá AI mới nhất và giải pháp chuyển đổi số bền vững.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80'
    },
    {
      title: 'Đêm Nhạc F-Fest 2026:\nBùng Cháy Sức Trẻ',
      desc: 'Sự kiện âm nhạc hoành tráng chào đón tân sinh viên K20 với sự góp mặt của các ca sĩ khách mời nổi tiếng hàng đầu Việt Nam.',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1280&q=80'
    },
    {
      title: 'FPT Career Expo 2026:\nChạm Ngõ Thành Công',
      desc: 'Hơn 50 doanh nghiệp hàng đầu tham gia tuyển dụng trực tiếp, phỏng vấn và mở ra cơ hội thực tập, việc làm cho sinh viên K17-K18.',
      image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1280&q=80'
    }
  ];

  // Load events from API
  useEffect(() => {
    fetch(`${API_BASE}/api/events`, { headers: getAuthHeaders(false) })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.events?.length > 0) {
          const mapped = filterActiveDiscoveryEvents(data.events)
            .slice(0, 4)
            .map(mapApiEventToHomeCard);
          setEvents(mapped);
          setFilteredEvents(mapped);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setEventsLoading(false));
  }, [isLoggedIn, userProfile.role]);

  // Automatic Hero Slide transition
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % sliderData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Perform dynamic filtering
  const handleFilterSubmit = () => {
    let result = events;

    // Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(ev =>
        ev.title.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q)
      );
    }

    // Category Filter
    if (categoryFilter !== 'Tất cả') {
      result = result.filter(ev => ev.category === categoryFilter);
    }

    // Time Filter (Simulated)
    if (timeFilter !== 'Tất cả') {
      if (timeFilter === 'Hôm nay') {
        // Just simulate sorting/filtering for visual effect
        result = result.slice(0, 1);
      } else if (timeFilter === 'Tuần này') {
        result = result.slice(0, 2);
      }
    }

    setFilteredEvents(result);
  };

  // Quick Filter by Search Bar on Nav
  const handleNavSearch = (e) => {
    if (e.key === 'Enter') {
      let result = events.filter(ev =>
        ev.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        ev.category.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      setFilteredEvents(result);
    }
  };

  const handleViewDetail = (event) => {
    navigate('/events');
    showToast?.(`Xem chi tiết: ${event.title}`, 'success');
  };

  // Event Registration Logic
  const handleRegister = async (eventId) => {
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để đăng ký tham gia sự kiện!', 'error');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    const target = events.find((ev) => ev.id === eventId);
    if (!target) return;

    if (target.registered) {
      showToast('Bạn đã đăng ký sự kiện này. Xem tại Sự kiện của tôi.', 'success');
      return;
    }

    if (target.eventState === 'expired' || target.eventState === 'postponed') {
      showToast('Sự kiện này hiện không thể đăng ký.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/events/${eventId}/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || 'Không thể đăng ký sự kiện.', 'error');
        return;
      }

      const updated = mapApiEventToHomeCard({ ...data.event, isRegistered: true });
      setEvents((prev) => prev.map((ev) => (ev.id === eventId ? updated : ev)));
      showToast(data.message || 'Đăng ký sự kiện thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể kết nối máy chủ.', 'error');
    }
  };

  // Synchronize filtered events when main events state changes (e.g. registered/remaining updates)
  useEffect(() => {
    let result = events;
    if (categoryFilter !== 'Tất cả') {
      result = result.filter(ev => ev.category === categoryFilter);
    }
    if (searchQuery.trim() !== '') {
      result = result.filter(ev => ev.title.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    }
    setFilteredEvents(result);
  }, [events]);

  return (
    <PublicAdminShell
      activeNav="home"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchKeyDown={handleNavSearch}
    >
    <div className="home-layout">
      {/* 2. Hero Banner Slider (Figma 38:1158) */}
      <section className="hero-banner-slider">
        {sliderData.map((slide, index) => (
          <div
            key={index}
            className={`hero-slide ${index === activeSlide ? 'active' : ''}`}
            style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.7)), url(${slide.image})` }}
          >
            <div className="hero-content-container">
              <span className="hero-tag-badge">SỰ KIỆN NỔI BẬT</span>
              <h1 className="hero-title">{slide.title}</h1>
              <p className="hero-description">{slide.desc}</p>
              <button
                className="hero-cta-btn"
                onClick={() => {
                  if (index === 0 && events[0]?.id) {
                    handleRegister(events[0].id);
                  } else {
                    navigate('/events');
                  }
                }}
              >
                Đăng ký tham gia ngay
              </button>
            </div>
          </div>
        ))}

        {/* Dot Indicators */}
        <div className="hero-dot-indicators">
          {sliderData.map((_, index) => (
            <button
              key={index}
              className={`slider-dot ${index === activeSlide ? 'active' : ''}`}
              onClick={() => setActiveSlide(index)}
              aria-label={`Slide ${index + 1}`}
            ></button>
          ))}
        </div>
      </section>

      {/* 3. Filter Bar (Figma 38:1315) */}
      <section className="filter-bar-section">
        <div className="filter-bar-card">
          <div className="filter-group">
            <span className="filter-icon">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="currentColor" />
              </svg>
            </span>
            <div className="filter-control">
              <label htmlFor="time-select" className="filter-label">Thời gian</label>
              <select
                id="time-select"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="Tất cả">Tất cả thời gian</option>
                <option value="Hôm nay">Hôm nay</option>
                <option value="Tuần này">Tuần này</option>
              </select>
            </div>
          </div>

          <div className="filter-divider-line"></div>

          <div className="filter-group">
            <span className="filter-icon">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" fill="currentColor" />
              </svg>
            </span>
            <div className="filter-control">
              <label htmlFor="category-select" className="filter-label">Chủ đề</label>
              <select
                id="category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
              >
                <option value="Tất cả">Tất cả chủ đề</option>
                <option value="Âm nhạc">Âm nhạc</option>
                <option value="Workshop">Workshop</option>
                <option value="Công nghệ">Công nghệ</option>
                <option value="Kết nối">Kết nối</option>
              </select>
            </div>
          </div>

          <button className="filter-submit-btn" onClick={handleFilterSubmit}>
            Lọc kết quả
          </button>
        </div>
      </section>

      {/* 4. Recommended Section & Grid Cards (Figma 38:1179) */}
      <main className="recommended-section">
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <span className="recommended-title-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
              </svg>
            </span>
            <h2>Gợi ý cho bạn</h2>
          </div>
          <a href="#" className="see-all-link" onClick={(e) => { e.preventDefault(); setFilteredEvents(events); setCategoryFilter('Tất cả'); }}>
            <span>Xem tất cả</span>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
            </svg>
          </a>
        </div>

        {/* Dynamic Grid Cards */}
        {eventsLoading ? (
          <div className="no-events-card">
            <p>Đang tải sự kiện...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="event-grid-cards">
            {filteredEvents.map((ev) => (
              <article key={ev.id} className="event-card-item">
                {/* Image block & Category badge */}
                <div className="event-card-image-wrapper">
                  <img src={ev.image} alt={ev.title} className="event-card-img" />
                  <span className="event-card-category-badge">{ev.category}</span>
                </div>

                {/* Event text body */}
                <div className="event-card-body">
                  <h3 className="event-card-title" title={ev.title}>{ev.title}</h3>

                  <div className="event-card-details">
                    <div className="detail-row">
                      <span className="detail-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="currentColor" />
                        </svg>
                      </span>
                      <span>{ev.date} • {ev.time}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
                        </svg>
                      </span>
                      <span className="location-text" title={ev.location}>{ev.location}</span>
                    </div>
                  </div>

                  <div className="event-card-divider"></div>

                  {/* Remaining Tickets & Actions */}
                  <div className="event-card-footer">
                    <div className="ticket-info">
                      <div className="ticket-remain-row">
                        <span className="ticket-icon">
                          <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-2 .89-2 2v4c1.1 0 1.99.9 1.99 2S3.1 14 2 14v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.53c-1.27.73-2 2.02-2 3.53s.73 2.8 2 3.53V18H4v-1.47c1.27-.73 2-2.02 2-3.53s-.73-2.8-2-3.53V6h16v2.47zM9 12h6v2H9zm0-4h6v2H9zm0 8h6v2H9z" fill="currentColor" />
                          </svg>
                        </span>
                        <span className="ticket-remain-text">Còn: {ev.remainingTickets}/{ev.totalTickets}</span>
                      </div>
                      <span className={`status-pill ${ev.status === 'SẮP HẾT CHỖ' ? 'status-danger' : 'status-success'}`}>
                        {ev.status}
                      </span>
                    </div>

                    <div className="event-card-actions">
                      <button
                        type="button"
                        className="btn-card-detail"
                        onClick={() => handleViewDetail(ev)}
                      >
                        Xem chi tiết
                      </button>
                      <button
                        type="button"
                        className={`btn-card-register ${ev.registered ? 'btn-registered' : ''}`}
                        onClick={() => handleRegister(ev.id)}
                      >
                        {ev.registered ? (
                          <>
                            <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '4px' }}>
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                            </svg>
                            Đã đăng ký
                          </>
                        ) : 'Đăng ký ngay'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="no-events-card">
            <svg viewBox="0 0 24 24" width="64" height="64" className="no-events-icon">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor" />
            </svg>
            <p>Không tìm thấy sự kiện nào khớp với từ khóa/bộ lọc của bạn.</p>
            <button className="reset-filter-btn" onClick={() => { setCategoryFilter('Tất cả'); setTimeFilter('Tất cả'); setSearchQuery(''); setFilteredEvents(events); }}>Xóa bộ lọc</button>
          </div>
        )}
      </main>

      <ChatbotFloating context="home" />

      <SiteFooter />
    </div>
    </PublicAdminShell>
  );
};

export default Home;
