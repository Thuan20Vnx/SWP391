import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import EventDiscoveryCard from '../components/EventDiscoveryCard';
import PublicAdminShell from '../layouts/PublicAdminShell';
import SiteFooter from '../components/SiteFooter';
import useUserProfile from '../hooks/useUserProfile';
import { API_BASE, getAuthHeaders } from '../utils/api';
import {
  CATEGORY_FILTERS,
  STATE_FILTERS,
  FIGMA_SAMPLE_EVENTS,
  mapApiEventToCard,
  filterEventsByCategory,
  filterEventsBySearch,
  filterEventsByState,
  sortEventsByStatePriority,
} from '../data/eventDiscoveryData';

const PAGE_SIZE = 6;
const USE_FIGMA_FALLBACK = false;
const DEFAULT_STATE_FILTER = 'open';

const Events = ({ showToast }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState(USE_FIGMA_FALLBACK ? FIGMA_SAMPLE_EVENTS : []);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState(DEFAULT_STATE_FILTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { isLoggedIn, userProfile } = useUserProfile();

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/events`, { headers: getAuthHeaders(false) })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.events?.length > 0) {
          setEvents(data.events.map(mapApiEventToCard));
        } else if (USE_FIGMA_FALLBACK) {
          setEvents(FIGMA_SAMPLE_EVENTS.filter((ev) => ev.cardState === 'active' && ev.filledSlots < ev.totalSlots));
        } else {
          setEvents([]);
        }
      })
      .catch((err) => {
        console.error(err);
        if (USE_FIGMA_FALLBACK) setEvents(FIGMA_SAMPLE_EVENTS);
        showToast?.('Không thể tải danh sách sự kiện', 'error');
      })
      .finally(() => setLoading(false));
  }, [showToast, isLoggedIn, userProfile.role]);

  const filteredEvents = useMemo(() => {
    let result = filterEventsByState(events, stateFilter);
    result = filterEventsByCategory(result, activeFilter);
    result = filterEventsBySearch(result, searchQuery);
    return sortEventsByStatePriority(result);
  }, [events, stateFilter, activeFilter, searchQuery]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;

  const handleRegister = async (event) => {
    if (event.cardState === 'postponed') {
      handleDetail(event);
      return;
    }

    if (event.cardState === 'expired') {
      showToast('Sự kiện này đã kết thúc, không thể đăng ký.', 'error');
      return;
    }

    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để đăng ký tham gia sự kiện!', 'error');
      setTimeout(() => navigate('/login'), 1200);
      return;
    }

    if (event.cardState === 'registered' || event.registered) {
      showToast('Mở vé điện tử sự kiện (đang phát triển).', 'success');
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

      const updatedEvent = data.event;
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === event.id
            ? mapApiEventToCard({
                ...updatedEvent,
                isRegistered: true,
              })
            : ev
        )
      );
      showToast(data.message || 'Đăng ký sự kiện thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể kết nối máy chủ. Vui lòng thử lại.', 'error');
    }
  };

  const handleDetail = (event) => {
    navigate(`/events/${event.id}`);
  };

  return (
    <PublicAdminShell
      activeNav="events"
      searchPlaceholder="Tìm kiếm sự kiện..."
      searchValue={searchQuery}
      onSearchChange={(value) => {
        setSearchQuery(value);
        setVisibleCount(PAGE_SIZE);
      }}
    >
    <div className="events-page home-layout">
      <main className="events-page__main">
        <section className="events-page__hero">
          <h1>Khám phá sự kiện tại FPT</h1>
          <p>Tìm kiếm và tham gia những sự kiện sôi động nhất dành cho cộng đồng FPT</p>
        </section>

        <section className="events-page__state-filters" aria-label="Lọc theo trạng thái">
          {STATE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`events-page__state-pill ${stateFilter === filter.id ? 'is-active' : ''}`}
              onClick={() => {
                setStateFilter(filter.id);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              {filter.label}
            </button>
          ))}
        </section>

        <section className="events-page__filters" aria-label="Lọc theo chủ đề">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`events-page__filter-pill ${activeFilter === filter.id ? 'is-active' : ''}`}
              onClick={() => {
                setActiveFilter(filter.id);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              {filter.label}
            </button>
          ))}
        </section>

        {loading ? (
          <div className="events-page__loading">
            <span className="btn-spinner events-page__spinner" />
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="events-page__empty">
            <p>
              {stateFilter === 'expired' && 'Chưa có sự kiện đã kết thúc trong bộ lọc này.'}
              {stateFilter === 'postponed' && 'Không có sự kiện bị hoãn.'}
              {stateFilter === 'open' && 'Không có sự kiện đang mở đăng ký.'}
            </p>
            <button
              type="button"
              className="events-page__reset-btn"
              onClick={() => {
                setActiveFilter('all');
                setStateFilter(DEFAULT_STATE_FILTER);
                setSearchQuery('');
                setVisibleCount(PAGE_SIZE);
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <section className="events-page__grid">
            {visibleEvents.map((event) => (
              <EventDiscoveryCard
                key={event.id}
                event={event}
                onDetail={handleDetail}
                onPrimaryAction={handleRegister}
              />
            ))}
          </section>
        )}

        {hasMore && !loading && (
          <div className="events-page__load-more-wrap">
            <button
              type="button"
              className="events-page__load-more"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Xem thêm sự kiện
              <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
                <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </button>
          </div>
        )}
      </main>

      <SiteFooter />

      <button
        type="button"
        className="events-page__fab"
        aria-label="Quà tặng sự kiện"
        onClick={() => showToast('Tính năng ưu đãi sắp ra mắt!', 'success')}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z" />
        </svg>
      </button>
    </div>
    </PublicAdminShell>
  );
};

export default Events;
