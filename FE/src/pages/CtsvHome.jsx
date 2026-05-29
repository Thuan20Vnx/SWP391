import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import { FE_LOGO, FE_LOGO_ALT } from '../assets/brand';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { fetchCtsvEvents, fetchCtsvStats, MOCK_EVENTS, MOCK_STATS } from '../services/ctsvApi';
import { clearSession, getRoleDisplayLabel, getUserRole, isCtsvRole, normalizeRole } from '../utils/auth';
import { isPendingApproval, statusClass } from '../utils/eventStatus';

const CtsvHome = ({ showToast }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [activeSlide, setActiveSlide] = useState(0);
  const [userProfile, setUserProfile] = useState({
    fullname: localStorage.getItem('userFullname') || 'Cán bộ CTSV',
    picture: defaultAvatar
  });

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
    if (!isCtsvRole()) {
      navigate('/', { replace: true });
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.status === 200 ? res.json() : Promise.reject()))
      .then((data) => {
        const u = data.user;
        const role = normalizeRole(u.role);
        if (!isCtsvRole(role)) {
          navigate('/', { replace: true });
          return;
        }
        localStorage.setItem('userRole', role);
        setUserProfile({
          fullname: u.fullname || 'Cán bộ CTSV',
          picture: u.picture || defaultAvatar
        });
        localStorage.setItem('userFullname', u.fullname || '');
      })
      .catch(() => {});

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
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliderData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleFilterSubmit = () => {
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
  };

  const handleManage = (ev) => {
    navigate(`/ctsv/events/${ev.id}`);
  };

  const handleLogout = () => {
    clearSession();
    showToast('Đã đăng xuất tài khoản CTSV.', 'info');
    navigate('/login');
  };

  return (
    <div className="home-layout ctsv-home-layout">
      <header className="home-header">
        <div className="header-container">
          <button
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Mở menu"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
            </svg>
          </button>

          <div className="header-logo" onClick={() => navigate('/ctsv')}>
            <img src={FE_LOGO} alt={FE_LOGO_ALT} className="logo-img" />
          </div>

          <nav className={`header-nav ${mobileMenuOpen ? 'mobile-active' : ''}`}>
            <a href="/ctsv" className="nav-link active" onClick={(e) => { e.preventDefault(); navigate('/ctsv'); setMobileMenuOpen(false); }}>Trang chủ</a>
            <a href="/ctsv/events" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/ctsv/events'); setMobileMenuOpen(false); }}>Sự kiện</a>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); showToast('Quản lý câu lạc bộ!', 'info'); setMobileMenuOpen(false); }}>Câu lạc bộ</a>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); showToast('Tin tức nội bộ!', 'info'); setMobileMenuOpen(false); }}>Tin tức</a>
            <a href="/ctsv" className="nav-link nav-link-ctsv-badge active" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); }}>CTSV</a>
          </nav>

          <div className="header-search-box">
            <span className="search-icon-inside">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilterSubmit()}
              className="search-input"
            />
          </div>

          <div className="header-actions">
            <button
              className="notif-bell-btn"
              onClick={() => showToast('3 đề xuất sự kiện chờ bạn phê duyệt.', 'info')}
              aria-label="Thông báo"
            >
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" fill="currentColor" />
              </svg>
              <span className="notif-badge"></span>
            </button>

            <div className="auth-profile-wrapper">
              <div className="profile-display-card">
                <Link to="/profile" className="profile-display-card-link" title="Hồ sơ cán bộ">
                  <div className="profile-info-text">
                    <span className="profile-name">{userProfile.fullname}</span>
                    <span className="profile-role profile-role-ctsv">
                      {getRoleDisplayLabel(getUserRole(), userProfile.course || '')}
                    </span>
                  </div>
                  <div className="profile-avatar-circle">
                    <img src={userProfile.picture} alt="Avatar CTSV" />
                  </div>
                </Link>
                <button className="small-logout-btn" onClick={handleLogout} title="Đăng xuất">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

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
              <button className="hero-cta-btn" onClick={() => navigate('/ctsv/dashboard')}>
                Vào bảng điều khiển
              </button>
            </div>
          </div>
        ))}
        <div className="hero-dot-indicators">
          {sliderData.map((_, index) => (
            <button
              key={index}
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
              <label htmlFor="ctsv-time-select" className="filter-label">Thời gian</label>
              <select id="ctsv-time-select" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="filter-select">
                <option value="Tất cả">Tất cả thời gian</option>
                <option value="Hôm nay">Hôm nay</option>
                <option value="Tuần này">Tuần này</option>
              </select>
            </div>
          </div>
          <div className="filter-divider-line" />
          <div className="filter-group">
            <div className="filter-control">
              <label htmlFor="ctsv-category-select" className="filter-label">Chủ đề</label>
              <select id="ctsv-category-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
                <option value="Tất cả">Tất cả chủ đề</option>
                <option value="Âm nhạc">Âm nhạc</option>
                <option value="Workshop">Workshop</option>
                <option value="Công nghệ">Công nghệ</option>
                <option value="Kết nối">Kết nối</option>
              </select>
            </div>
          </div>
          <button className="filter-submit-btn" onClick={handleFilterSubmit}>Lọc kết quả</button>
        </div>
      </section>

      <main className="recommended-section">
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <h2>Sự kiện đang quản lý</h2>
          </div>
          <a href="/ctsv/events" className="see-all-link" onClick={(e) => { e.preventDefault(); navigate('/ctsv/events'); setMobileMenuOpen(false); }}>
            <span>Xem tất cả</span>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
            </svg>
          </a>
        </div>

        <div className="event-grid-cards">
          {filteredEvents.map((ev) => (
            <article key={ev.id} className="event-card-item">
              <div className="event-card-image-wrapper">
                <img src={ev.image} alt={ev.title} className="event-card-img" />
                <span className="event-card-category-badge">{ev.category}</span>
              </div>
              <div className="event-card-body">
                <h3 className="event-card-title">{ev.title}</h3>
                <div className="event-card-details">
                  <div className="detail-row">
                    <span>{ev.date} • {ev.time}</span>
                  </div>
                  <div className="detail-row">
                    <span className="location-text">{ev.location}</span>
                  </div>
                </div>
                <div className="event-card-divider" />
                <div className="event-card-footer">
                  <div className="ticket-info">
                    <span className="ticket-remain-text">Còn: {ev.remainingTickets}/{ev.totalTickets}</span>
                    <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>{ev.status}</span>
                  </div>
                  <button className="btn-card-register btn-card-manage" onClick={() => handleManage(ev)}>
                    {isPendingApproval(ev) ? 'Phê duyệt' : 'Quản lý'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="home-footer">
        <div className="footer-top-columns">
          <div className="footer-branding-col">
            <img src={FE_LOGO} alt={FE_LOGO_ALT} className="footer-logo-img" />
            <p className="footer-brand-desc">
              Cổng quản trị F-Events dành cho Ban Công tác sinh viên — phê duyệt, điều phối và báo cáo sự kiện toàn trường.
            </p>
          </div>
          <div className="footer-links-col">
            <h4>Quản lý</h4>
            <ul className="footer-links-list">
              <li><a href="/ctsv/proposals" onClick={(e) => { e.preventDefault(); navigate('/ctsv/proposals'); }}>Phê duyệt đề xuất</a></li>
              <li><a href="/ctsv/events/create" onClick={(e) => { e.preventDefault(); navigate('/ctsv/events/create'); }}>Sự kiện cấp trường</a></li>
              <li><a href="/ctsv/partners" onClick={(e) => { e.preventDefault(); navigate('/ctsv/partners'); }}>Đối tác</a></li>
            </ul>
          </div>
          <div className="footer-links-col">
            <h4>Hỗ trợ</h4>
            <ul className="footer-links-list">
              <li><a href="#" onClick={(e) => e.preventDefault()}>Liên hệ phòng CTSV</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Hướng dẫn hệ thống</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom-row">
          <p className="copyright-text">© 2026 FPT Event Platform — CTSV Portal</p>
        </div>
      </footer>
    </div>
  );
};

export default CtsvHome;
