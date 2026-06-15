import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ChatbotFloating from '../components/ChatbotFloating';
import PublicAdminShell from '../layouts/PublicAdminShell';
import SiteFooter from '../components/SiteFooter';
import AppSelect from '../components/ui/AppSelect';
import EventDiscoveryCard from '../components/EventDiscoveryCard';
import { getUserRole, isAdminRole, isClubManagerRole } from '../utils/auth';
import {
  isPureCtsvStaff,
  navigateClubEventManage,
  resolveDiscoveryCardProps,
} from '../utils/publicEventStaffAccess';

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

import { API_BASE, getAuthHeaders } from '../utils/api';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { fetchPublicEvents } from '../services/eventsApi';
import useUserProfile from '../hooks/useUserProfile';
import useManagedClubs from '../hooks/useManagedClubs';
import {
  mapApiEventToCard,
  filterActiveDiscoveryEvents,
  HOME_RECOMMEND_TABS,
  sortHomeEventsByRecommendTab,
  sortEventsByPopular,
  HOME_DISPLAY_LIMIT,
} from '../data/eventDiscoveryData';
import SystemMaintenanceBanner from '../components/SystemMaintenanceBanner';
import HomeHeroSlider from '../components/home/HomeHeroSlider';

const Home = ({ showToast }) => {
  const navigate = useNavigate();
  const { isLoggedIn, userProfile } = useUserProfile();

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 400);
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [recommendTab, setRecommendTab] = useState('newest');

  const role = userProfile.role || getUserRole();
  const isAdminViewer = isLoggedIn && isAdminRole(role);
  const isCtsvStaff = isLoggedIn && isPureCtsvStaff(role);
  const isClubManager = isLoggedIn && isClubManagerRole(role);
  const { clubs: managedClubs, activeClub } = useManagedClubs(isClubManager, role);
  const clubManagerContext = useMemo(
    () =>
      isClubManager
        ? {
            managedClubs,
            activeClubId: activeClub?.id || '',
            userEmail: localStorage.getItem('userEmail') || '',
          }
        : null,
    [isClubManager, managedClubs, activeClub?.id]
  );

  const sliderData = [
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

  // Load events from API (search via query param q)
  useEffect(() => {
    setEventsLoading(true);
    fetchPublicEvents({
      q: debouncedSearch || undefined,
      category: categoryFilter !== 'Tất cả' ? categoryFilter : undefined,
    })
      .then((data) => {
        if (data.success && data.events?.length > 0) {
          const mapped = filterActiveDiscoveryEvents(data.events).map(mapApiEventToCard);
          setEvents(mapped);
        } else {
          setEvents([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setEventsLoading(false));
  }, [isLoggedIn, userProfile.role, debouncedSearch, categoryFilter]);

  const applyLocalFilters = (list) => {
    let result = list;
    if (timeFilter === 'Hôm nay') {
      const today = new Date().toDateString();
      result = result.filter((ev) => {
        const d = new Date(ev.startDate);
        return !Number.isNaN(d.getTime()) && d.toDateString() === today;
      });
    } else if (timeFilter === 'Tuần này') {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 7);
      result = result.filter((ev) => {
        const d = new Date(ev.startDate);
        return !Number.isNaN(d.getTime()) && d >= now && d <= weekEnd;
      });
    }
    return result;
  };

  const sortedEvents = useMemo(
    () => sortHomeEventsByRecommendTab(events, recommendTab, userProfile, isLoggedIn),
    [events, recommendTab, userProfile, isLoggedIn]
  );

  const filteredEvents = useMemo(
    () => applyLocalFilters(sortedEvents).slice(0, HOME_DISPLAY_LIMIT),
    [sortedEvents, timeFilter]
  );

  const heroSlides = useMemo(() => {
    const featured = sortEventsByPopular(events).slice(0, 3);
    if (featured.length === 0) return sliderData.map((s) => ({ ...s, eventId: null }));
    return featured.map((ev) => ({
      title: ev.title,
      dateLabel: ev.dateLabel,
      location: ev.location,
      categoryLabel: ev.categoryLabel || ev.category,
      organizerLabel: ev.organizerLabel,
      image: ev.thumbnail,
      eventId: ev.id,
    }));
  }, [events]);

  const handleFilterSubmit = () => {
    /* filtered via useMemo */
  };

  const handleNavSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleViewDetail = (event) => {
    if (!event?.id) return;
    navigate(`/events/${event.id}`);
  };

  const handleRegister = async (event) => {
    if (event?.cardState === 'postponed') {
      handleViewDetail(event);
      return;
    }

    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để đăng ký tham gia sự kiện!', 'error');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    if (event.cardState === 'expired') {
      showToast('Sự kiện này đã kết thúc, không thể đăng ký.', 'error');
      return;
    }

    if (event.cardState === 'registered' || event.registered) {
      showToast('Bạn đã đăng ký sự kiện này.', 'success');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/events/${event.id}/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || 'Không thể đăng ký sự kiện.', 'error');
        return;
      }

      const updated = mapApiEventToCard({ ...data.event, isRegistered: true });
      setEvents((prev) => prev.map((ev) => (ev.id === event.id ? updated : ev)));
      showToast(data.message || 'Đăng ký sự kiện thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể kết nối máy chủ.', 'error');
    }
  };

  return (
    <PublicAdminShell
      activeNav="home"
      searchPlaceholder="Tìm kiếm sự kiện..."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchKeyDown={handleNavSearch}
    >
    <div className="home-layout">
      <SystemMaintenanceBanner />
      <HomeHeroSlider
        slides={heroSlides}
        resolveDetailPath={(slide) => (slide.eventId ? `/events/${slide.eventId}` : null)}
      />

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
              <AppSelect
                id="time-select"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                variant="filter"
                options={HOME_TIME_FILTERS}
              />
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
              <AppSelect
                id="category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                variant="filter"
                options={HOME_CATEGORY_FILTERS}
              />
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
            <h2>Sự kiện nổi bật</h2>
          </div>
          <Link to="/events" className="see-all-link">
            <span>Xem tất cả</span>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
            </svg>
          </Link>
        </div>

        <div className="home-recommend-tabs" role="tablist" aria-label="Gợi ý sự kiện">
          {HOME_RECOMMEND_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={recommendTab === tab.id}
              className={`home-recommend-tab ${recommendTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setRecommendTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {eventsLoading ? (
          <div className="no-events-card">
            <p>Đang tải sự kiện...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <section className="event-discovery-grid">
            {filteredEvents.map((event) => {
              const cardProps = resolveDiscoveryCardProps({
                event,
                isCtsvStaff,
                isAdminViewer,
                isClubManager,
                clubManagerContext,
                onDetail: handleViewDetail,
                onRegister: handleRegister,
                onManageNavigate: (path) => navigate(path),
                onClubManageNavigate: (access) =>
                  navigateClubEventManage({ access, navigate, showToast }),
                showToast,
              });
              return (
                <EventDiscoveryCard
                  key={event.id}
                  event={event}
                  onDetail={cardProps.onDetail}
                  onPrimaryAction={cardProps.onPrimaryAction}
                  onManage={cardProps.onManage}
                  manageLabel={cardProps.manageLabel}
                  manageHint={cardProps.manageHint}
                  viewOnly={cardProps.viewOnly}
                />
              );
            })}
          </section>
        ) : (
          <div className="no-events-card">
            <svg viewBox="0 0 24 24" width="64" height="64" className="no-events-icon">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor" />
            </svg>
            <p>Không tìm thấy sự kiện nào khớp với bộ lọc hoặc tiêu chí gợi ý.</p>
            <button
              type="button"
              className="reset-filter-btn"
              onClick={() => {
                setCategoryFilter('Tất cả');
                setTimeFilter('Tất cả');
                setSearchQuery('');
                setRecommendTab('newest');
              }}
            >
              Xóa bộ lọc
            </button>
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
