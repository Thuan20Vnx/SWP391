import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import defaultAvatar from '../assets/profile_avatar.png';
import ProfileSidebarMenu from '../components/ProfileSidebarMenu';
import fptLogo from '../assets/fpt_logo.png';
import { API_BASE, getAuthHeaders } from '../utils/api';

const Home = ({ showToast }) => {
  const navigate = useNavigate();

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState({
    fullname: 'Trần Xuân Thuận',
    course: 'K18',
    picture: defaultAvatar,
    email: '',
    phone: '',
    campus: '',
    role: 'student',
    studentId: '',
    orientation: '',
    interests: []
  });

  const [profilePopupOpen, setProfilePopupOpen] = useState(false);

  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');

  // Active Hero Slider Index
  const [activeSlide, setActiveSlide] = useState(0);

  // AI Chatbot State
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Xin chào! Tôi là trợ lý ảo F-Events. Bạn cần tôi giúp gì hôm nay?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Event Data State (Simulated backend/local source matching Figma specs)
  const [events, setEvents] = useState([
    {
      id: 'event-f-fest',
      title: 'Đêm nhạc F-Fest: Giai điệu mùa hè',
      category: 'Âm nhạc',
      date: '20/05/2026',
      time: '19:00',
      location: 'FPT Plaza 2, Khu đô thị FPT, Quận Ngũ Hành Sơn, Đà Nẵng',
      remainingTickets: 15,
      totalTickets: 200,
      status: 'SẮP HẾT CHỖ',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      registered: false
    },
    {
      id: 'event-prompt',
      title: 'MISS GRAND FPTU 2026: BEAUTY FOR A CAUSE',
      category: 'Cuộc thi',
      date: '22/05/2026',
      time: '14:00',
      location: 'Đại học FPT Đà Nẵng - Khu đô thị FPT',
      remainingTickets: 40,
      totalTickets: 50,
      status: 'MỞ ĐĂNG KÝ',
      image: 'https://scontent.fhan2-4.fna.fbcdn.net/v/t39.30808-6/705403029_1427694349389553_9042205764042260599_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeGqr3fN2ncbJ3kTRNnkrqfTUA88PLy9ItdQDzw8vL0i1x6PI9N4fbjxcnN1zFWQKsvinv5MMDrkqzUE1Ha2WfZF&_nc_ohc=KNagPH3GpTIQ7kNvwEFbzgo&_nc_oc=AdpcxKrq6D8e7L1j7K-mbTcu7ELQM_FRhaZkOlR7BmwShxLfNo3SlxjXLwG8YfyNgKQ&_nc_zt=23&_nc_ht=scontent.fhan2-4.fna&_nc_gid=avGQ_Tw7XAX4k0EW0hSQoA&_nc_ss=7b2a8&oh=00_Af6QUlHZ_vYdTgfjiIu5w_RKPebIbXee2H7TN5ZeNerExw&oe=6A1B3B4B',
      registered: false
    },
    {
      id: 'event-hackathon',
      title: 'Hackathon 2026: Innovate for Green',
      category: 'Công nghệ',
      date: '25/05/2026',
      time: '08:00',
      location: 'FPT Software Ho Chi Minh',
      remainingTickets: 120,
      totalTickets: 150,
      status: 'MỞ ĐĂNG KÝ',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
      registered: false
    },
    {
      id: 'event-career',
      title: 'Career Fair: Kết nối doanh nghiệp',
      category: 'Kết nối',
      date: '28/05/2026',
      time: '09:00',
      location: 'Sân bóng FPTU',
      remainingTickets: 300,
      totalTickets: 500,
      status: 'MỞ ĐĂNG KÝ',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80',
      registered: false
    }
  ]);

  const [filteredEvents, setFilteredEvents] = useState(events);

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

  // Fetch authentication state & user details
  useEffect(() => {
    const logged = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(logged);

    if (logged) {
      const token = localStorage.getItem('authToken');
      if (token) {
        fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
          .then(res => {
            if (res.status === 200) return res.json();
            throw new Error('Load failed');
          })
          .then(data => {
            const u = data.user;
            setUserProfile({
              fullname: u.fullname || 'Trần Xuân Thuận',
              course: u.course || 'K18',
              picture: u.picture || u.avatar || defaultAvatar,
              email: u.email || '',
              phone: u.phone || '',
              campus: u.campus || '',
              role: u.role || 'guest',
              studentId: u.studentId || '',
              orientation: u.orientation || '',
              interests: u.interests || []
            });
            localStorage.setItem('userRole', u.role || 'guest');
          })
          .catch(err => {
            console.error('Failed to fetch user data for Home header:', err);
            // Keep default Trần Xuân Thuận details
          });
      }
    }
  }, []);

  useEffect(() => {
    if (!profilePopupOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') setProfilePopupOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [profilePopupOpen]);

  const getRoleLabel = (role) => {
    if (role === 'student') return `Sinh viên ${userProfile.course}`;
    if (role === 'staff') return 'Cán bộ FPT';
    if (role === 'ctsv') return 'Phòng CTSV';
    return 'Khách';
  };

  const handleOpenProfilePopup = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setProfilePopupOpen((prev) => !prev);
  };

  const handleProfileMenuAction = (action, label) => {
    setProfilePopupOpen(false);

    if (action === 'profile') {
      navigate('/profile');
      return;
    }

    if (action === 'browse-events') {
      navigate('/events');
      return;
    }

    if (action === 'scan') {
      return;
    }

    if (action === 'notifications') {
      return;
    }

    if (action === 'settings') {
      navigate('/settings');
      return;
    }

    if (action === 'schedule') {
      return;
    }
  };

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

  // Event Registration Logic
  const handleRegister = (eventId) => {
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để đăng ký tham gia sự kiện!', 'error');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      return;
    }

    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        if (ev.registered) {
          return { ...ev, registered: false, remainingTickets: ev.remainingTickets + 1 };
        }
        return { ...ev, registered: true, remainingTickets: ev.remainingTickets - 1 };
      }
      return ev;
    }));
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

  // Chatbot Send Message Logic
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    // Simulate AI response
    setTimeout(() => {
      let botResponse = 'Tôi rất muốn hỗ trợ bạn, tuy nhiên tính năng AI đang được tích hợp thêm. Bạn có muốn tìm các sự kiện Công nghệ hay Âm nhạc sắp tới không?';
      const lowercase = userMsg.toLowerCase();
      if (lowercase.includes('f-fest') || lowercase.includes('nhạc') || lowercase.includes('fest')) {
        botResponse = 'Sự kiện F-Fest: Giai điệu mùa hè sẽ diễn ra vào ngày 20/05 lúc 19:00 tại Hội trường A, FPT Tower. Hiện tại chỉ còn 15 vé trống thôi đó!';
      } else if (lowercase.includes('prompt') || lowercase.includes('ai') || lowercase.includes('workshop')) {
        botResponse = 'Workshop "Làm chủ Prompt Engineering với AI" được tổ chức vào ngày 22/05 lúc 14:00 tại Phòng Lab 402 Gamma. Nhanh tay đăng ký nhé!';
      } else if (lowercase.includes('profile') || lowercase.includes('hồ sơ') || lowercase.includes('trang cá nhân')) {
        botResponse = 'Bạn có thể mở menu tài khoản bằng cách nhấp vào hình đại diện ở góc trên bên phải — menu sẽ hiện ra ngay tại trang chủ.';
      } else if (lowercase.includes('đăng ký') || lowercase.includes('vé')) {
        botResponse = 'Để đăng ký sự kiện, bạn chỉ cần bấm nút "Đăng ký ngay" trên thẻ sự kiện. Hệ thống sẽ tự động gửi QR vé về tài khoản của bạn!';
      } else if (lowercase.includes('hello') || lowercase.includes('chào') || lowercase.includes('hi')) {
        botResponse = 'Xin chào! Tôi có thể giúp gì cho bạn về các sự kiện của sinh viên FPT?';
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 1000);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    setProfilePopupOpen(false);
    navigate('/');
  };

  return (
    <div className="home-layout">
      {/* 1. Header (Figma 38:1393) */}
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

          {/* Logo F Events */}
          <div className="header-logo" onClick={() => navigate('/')}>
            <img
              src={fptLogo}
              alt="F Events Logo"
              className="logo-img"
            />
          </div>

          {/* Navigation Links */}
          <nav className={`header-nav ${mobileMenuOpen ? 'mobile-active' : ''}`}>
            <Link to="/" className="nav-link active" onClick={() => setMobileMenuOpen(false)}>Trang chủ</Link>
            <Link to="/events" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Sự kiện</Link>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); }}>Câu lạc bộ</a>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); }}>Tin tức</a>
          </nav>

          {/* Search event inputs */}
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
              onKeyDown={handleNavSearch}
              className="search-input"
            />
          </div>

          {/* Right Area: Actions (Notification & Authenticated State) */}
          <div className="header-actions">
            {/* Notification Bell */}
            <button
              className="notif-bell-btn"
              onClick={() => {}}
              aria-label="Thông báo"
            >
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" fill="currentColor" />
              </svg>
              <span className="notif-badge"></span>
            </button>

            {/* Profile Entry */}
            <div className="auth-profile-wrapper">
              {isLoggedIn ? (
                <div className="profile-display-card">
                  <button
                    type="button"
                    className={`profile-display-card-link ${profilePopupOpen ? 'profile-display-card-link--open' : ''}`}
                    title="Mở menu tài khoản"
                    onClick={handleOpenProfilePopup}
                    aria-expanded={profilePopupOpen}
                  >
                    <div className="profile-info-text">
                      <span className="profile-name">{userProfile.fullname}</span>
                      <span className="profile-role">{getRoleLabel(userProfile.role)}</span>
                      {userProfile.role === 'student' && (
                        <span className="profile-student-brief">
                          {[userProfile.studentId, userProfile.course].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                    <div className="profile-avatar-circle">
                      <img src={userProfile.picture} alt="User Avatar" />
                    </div>
                  </button>

                  {profilePopupOpen && (
                    <>
                      <div
                        className="profile-menu-backdrop"
                        onClick={() => setProfilePopupOpen(false)}
                        role="presentation"
                      />
                      <div
                        className="profile-menu-dropdown"
                        role="menu"
                        aria-label="Menu tài khoản"
                      >
                        <ProfileSidebarMenu
                          activeItem=""
                          userProfile={userProfile}
                          onMenuAction={handleProfileMenuAction}
                          onLogout={handleLogout}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="auth-buttons">
                  <Link to="/login" className="btn-auth btn-auth-login">Đăng nhập</Link>
                  <Link to="/signup" className="btn-auth btn-auth-signup">Đăng ký</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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
                  if (index === 0) handleRegister('event-hackathon');
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
        {filteredEvents.length > 0 ? (
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

                  {/* Remaining Tickets & Register Button */}
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

                    <button
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

      {/* 5. Floating AI Chatbot FAB (Figma 38:1433) */}
      <div className="chatbot-floating-wrapper">
        {/* Chat window panel */}
        {chatbotOpen && (
          <div className="chatbot-window">
            <div className="chat-window-header">
              <div className="chat-header-user">
                <div className="chat-avatar-circle">AI</div>
                <div>
                  <h4>Trợ lý ảo F-Events</h4>
                  <span className="online-indicator">Hoạt động</span>
                </div>
              </div>
              <button className="chat-close-btn" onClick={() => setChatbotOpen(false)} aria-label="Đóng chat">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
                </svg>
              </button>
            </div>

            <div className="chat-messages-container">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-bot'}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Nhập câu hỏi của bạn..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="chat-input-field"
              />
              <button type="submit" className="chat-send-btn" aria-label="Gửi">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* FAB Button */}
        <button
          className={`chatbot-fab-btn ${chatbotOpen ? 'fab-active' : ''}`}
          onClick={() => setChatbotOpen(!chatbotOpen)}
        >
          <span className="fab-icon">
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor" />
            </svg>
          </span>
          <span className="fab-text">Bạn cần giúp gì?</span>
        </button>
      </div>

      {/* 6. Footer (Figma 38:1341) */}
      <footer className="home-footer">
        <div className="footer-top-columns">
          <div className="footer-branding-col">
            <img src={fptLogo} alt="F Events" className="footer-logo-img" />
            <p className="footer-brand-desc">
              FPT Event Platform - Nền tảng kết nối, kiến tạo và lan tỏa sức trẻ thông qua những sự kiện, hoạt động ngoại khóa dành riêng cho sinh viên FPT.
            </p>
          </div>

          <div className="footer-links-col">
            <h4>Khám phá</h4>
            <ul className="footer-links-list">
              <li><a href="#" onClick={(e) => e.preventDefault()}>Sự kiện sắp tới</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Câu lạc bộ</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Địa điểm</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Thành viên</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>Hỗ trợ</h4>
            <ul className="footer-links-list">
              <li><a href="#" onClick={(e) => e.preventDefault()}>Trung tâm trợ giúp</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Hướng dẫn đăng ký</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Liên hệ ban tổ chức</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>Báo cáo sự cố</a></li>
            </ul>
          </div>

          <div className="footer-social-col">
            <h4>Kết nối xã hội</h4>
            <div className="social-icon-row">
              <a href="#" className="social-icon-box" aria-label="Facebook" onClick={(e) => e.preventDefault()}>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" fill="currentColor" />
                </svg>
              </a>
              <a href="#" className="social-icon-box" aria-label="Instagram" onClick={(e) => e.preventDefault()}>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="currentColor" />
                </svg>
              </a>
              <a href="#" className="social-icon-box" aria-label="Twitter/X" onClick={(e) => e.preventDefault()}>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <p className="copyright-text">© 2026 FPT Event Platform. All rights reserved.</p>
          <div className="footer-policy-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Bảo mật</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
