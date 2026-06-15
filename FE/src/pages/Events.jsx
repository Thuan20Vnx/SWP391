import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import EventDiscoveryCard from '../components/EventDiscoveryCard';
import AppSelect from '../components/ui/AppSelect';
import PublicAdminShell from '../layouts/PublicAdminShell';
import SiteFooter from '../components/SiteFooter';
import useUserProfile from '../hooks/useUserProfile';
import useManagedClubs from '../hooks/useManagedClubs';
import { API_BASE, getAuthHeaders } from '../utils/api';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { fetchPublicEvents, getCachedPublicEventsList, prefetchPublicEventById, syncEventRegistrationInCache } from '../services/eventsApi';
import { getUserRole, isAdminRole, isClubManagerRole } from '../utils/auth';
import {
  isPureCtsvStaff,
  navigateClubEventManage,
  resolveDiscoveryCardProps,
} from '../utils/publicEventStaffAccess';
import {
  CATEGORY_FILTERS,
  STATE_FILTERS,
  ORGANIZER_FILTERS,
  FIGMA_SAMPLE_EVENTS,
  mapApiEventToCard,
  markDiscoveryCardRegistered,
  filterEventsByState,
  filterEventsByOrganizer,
  sortEventsByStatePriority,
} from '../data/eventDiscoveryData';

const PAGE_SIZE = 6;
const USE_FIGMA_FALLBACK = false;
const DEFAULT_STATE_FILTER = 'open';

const ORGANIZER_SELECT_OPTIONS = ORGANIZER_FILTERS.map((f) => ({
  value: f.id,
  label: f.label,
}));

const CATEGORY_SELECT_OPTIONS = CATEGORY_FILTERS.map((f) => ({
  value: f.id,
  label: f.label,
}));

const Events = ({ showToast }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const clubFilter = searchParams.get('club') || '';
  const [clubFilterLabel, setClubFilterLabel] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [organizerFilter, setOrganizerFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState(DEFAULT_STATE_FILTER);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 400);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const buildEventQuery = () => ({
    q: debouncedSearch || undefined,
    category: activeFilter !== 'all' ? activeFilter : undefined,
    club: clubFilter || undefined,
  });

  const mapListToCards = (data) => {
    if (data?.success && data.events?.length > 0) {
      return data.events.map(mapApiEventToCard);
    }
    if (USE_FIGMA_FALLBACK && !debouncedSearch && !clubFilter) {
      return FIGMA_SAMPLE_EVENTS.filter((ev) => ev.cardState === 'active' && ev.filledSlots < ev.totalSlots);
    }
    return [];
  };

  const initialCards = mapListToCards(getCachedPublicEventsList(buildEventQuery()));
  const [events, setEvents] = useState(
    initialCards.length > 0 ? initialCards : USE_FIGMA_FALLBACK ? FIGMA_SAMPLE_EVENTS : []
  );
  const [loading, setLoading] = useState(initialCards.length === 0 && !USE_FIGMA_FALLBACK);
  const filterParamsRef = useRef({ debouncedSearch, activeFilter, clubFilter });
  filterParamsRef.current = { debouncedSearch, activeFilter, clubFilter };

  const { isLoggedIn, userProfile } = useUserProfile();
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

  useEffect(() => {
    let cancelled = false;
    const params = buildEventQuery();
    const cached = getCachedPublicEventsList(params);
    const hasCached = Boolean(cached?.events?.length);

    if (hasCached) {
      setEvents(mapListToCards(cached));
      setLoading(false);
    } else {
      setLoading(true);
    }

    fetchPublicEvents(params)
      .then((data) => {
        if (cancelled) return;
        setEvents(mapListToCards(data));
      })
      .catch((err) => {
        console.error(err);
        if (cancelled) return;
        if (!hasCached) {
          if (USE_FIGMA_FALLBACK) setEvents(FIGMA_SAMPLE_EVENTS);
          showToast?.('Không thể tải danh sách sự kiện', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showToast, debouncedSearch, activeFilter, clubFilter]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    const { debouncedSearch: search, activeFilter: filter, clubFilter: club } = filterParamsRef.current;

    fetchPublicEvents(
      {
        q: search || undefined,
        category: filter !== 'all' ? filter : undefined,
        club: club || undefined,
      },
      { forceRefresh: true }
    )
      .then((data) => {
        if (!cancelled) setEvents(mapListToCards(data));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userProfile.role]);

  useEffect(() => {
    if (!clubFilter) {
      setClubFilterLabel('');
      return;
    }

    const matched = events.find((event) => {
      const key = clubFilter.toLowerCase();
      return (
        String(event.clubSlug || '').toLowerCase() === key
        || String(event.clubId || '').toLowerCase() === key
      );
    });
    if (matched?.clubName) {
      setClubFilterLabel(matched.clubName);
      return;
    }

    fetch(`${API_BASE}/api/clubs/${clubFilter}`, { headers: getAuthHeaders(false) })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.club?.name) {
          setClubFilterLabel(data.club.name);
        } else {
          setClubFilterLabel('');
        }
      })
      .catch(() => setClubFilterLabel(''));
  }, [clubFilter, events]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (!clubFilter) {
      result = filterEventsByOrganizer(result, organizerFilter);
    }
    result = filterEventsByState(result, stateFilter);
    return sortEventsByStatePriority(result);
  }, [events, clubFilter, stateFilter, organizerFilter]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;

  const hasSecondaryFilters = organizerFilter !== 'all' || activeFilter !== 'all';

  const clearClubFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('club');
    setSearchParams(next, { replace: true });
    setClubFilterLabel('');
  };

  const resetFilters = () => {
    setActiveFilter('all');
    setOrganizerFilter('all');
    setStateFilter(DEFAULT_STATE_FILTER);
    setSearchQuery('');
    setVisibleCount(PAGE_SIZE);
    if (clubFilter) clearClubFilter();
  };

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
      handleDetail(event);
      return;
    }

    setEvents((prev) =>
      prev.map((ev) => (ev.id === event.id ? markDiscoveryCardRegistered(ev) : ev))
    );

    try {
      const res = await fetch(`${API_BASE}/api/events/${event.id}/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        setEvents((prev) => prev.map((ev) => (ev.id === event.id ? event : ev)));
        showToast(data.message || 'Không thể đăng ký sự kiện.', 'error');
        return;
      }

      const updated = mapApiEventToCard({ ...data.event, isRegistered: true });
      setEvents((prev) => prev.map((ev) => (ev.id === event.id ? updated : ev)));
      syncEventRegistrationInCache(event.id, data.event, { registered: true });
      showToast(data.message || 'Đăng ký sự kiện thành công!', 'success');
    } catch (err) {
      console.error(err);
      setEvents((prev) => prev.map((ev) => (ev.id === event.id ? event : ev)));
      showToast('Không thể kết nối máy chủ. Vui lòng thử lại.', 'error');
    }
  };

  const handleDetail = (event) => {
    if (!event?.id) {
      showToast?.('Không xác định được sự kiện.', 'error');
      return;
    }
    prefetchPublicEventById(event.id);
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
    <div className={`events-page home-layout${isAdminViewer || isCtsvStaff || isClubManager ? ' events-page--admin-view' : ''}`}>
      <main className="events-page__main">
        <section className="events-page__hero">
          <h1>
            {clubFilter
              ? `Sự kiện của ${clubFilterLabel || 'câu lạc bộ'}`
              : isAdminViewer
                ? 'Danh sách sự kiện toàn sàn'
                : isCtsvStaff
                  ? 'Khám phá sự kiện toàn trường'
                  : 'Khám phá sự kiện tại FPT'}
          </h1>
          <p>
            {clubFilter
              ? 'Chỉ hiển thị các sự kiện do câu lạc bộ này tổ chức.'
              : isAdminViewer
                ? 'Xem chi tiết sự kiện trên nền tảng — chế độ quản trị chỉ xem, không đăng ký tham gia.'
                : isCtsvStaff
                  ? 'CTSV chỉ xem thông tin sự kiện — không đăng ký hoặc mua vé. Sự kiện do CTSV tổ chức có thêm nút Quản lý.'
                  : isClubManager
                    ? 'Sự kiện do CLB bạn quản lý có nút Quản lý thay cho đăng ký. Nếu sự kiện thuộc CLB khác, bạn sẽ được chuyển sang portal CLB tương ứng.'
                    : 'Tìm kiếm và tham gia những sự kiện sôi động nhất dành cho cộng đồng FPT'}
          </p>
          {clubFilter && (
            <div className="events-page__club-filter-actions">
              <Link to={`/clubs/${clubFilter}`} className="events-page__club-filter-link">
                ← Quay lại trang CLB
              </Link>
              <button type="button" className="events-page__club-filter-clear" onClick={clearClubFilter}>
                Xem tất cả sự kiện
              </button>
            </div>
          )}
        </section>

        <section className="events-page__filter-bar" aria-label="Bộ lọc sự kiện">
          <div className="events-page__filter-bar-main">
            <div className="events-page__state-filters" role="group" aria-label="Trạng thái">
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
            </div>

            <div className="events-page__filter-dropdowns">
              {!clubFilter && (
                <div className="events-page__filter-field">
                  <span className="events-page__filter-field-label" id="events-organizer-filter-label">
                    Tổ chức
                  </span>
                  <AppSelect
                    id="events-organizer-filter"
                    aria-labelledby="events-organizer-filter-label"
                    value={organizerFilter}
                    onChange={(e) => {
                      setOrganizerFilter(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    options={ORGANIZER_SELECT_OPTIONS}
                    fullWidth={false}
                    className="events-page__filter-select"
                  />
                </div>
              )}
              <div className="events-page__filter-field">
                <span className="events-page__filter-field-label" id="events-category-filter-label">
                  Chủ đề
                </span>
                <AppSelect
                  id="events-category-filter"
                  aria-labelledby="events-category-filter-label"
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  options={CATEGORY_SELECT_OPTIONS}
                  fullWidth={false}
                  className="events-page__filter-select"
                />
              </div>
              {hasSecondaryFilters && (
                <button type="button" className="events-page__filter-clear" onClick={resetFilters}>
                  Xóa lọc
                </button>
              )}
            </div>
          </div>
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
              {clubFilter && ' CLB này chưa có sự kiện phù hợp bộ lọc hiện tại.'}
              {!clubFilter && organizerFilter !== 'all' && ' Thử đổi bộ lọc đơn vị tổ chức hoặc chủ đề.'}
            </p>
            <button type="button" className="events-page__reset-btn" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <section className="event-discovery-grid">
            {visibleEvents.map((event) => {
              const cardProps = resolveDiscoveryCardProps({
                event,
                isCtsvStaff,
                isAdminViewer,
                isClubManager,
                clubManagerContext,
                onDetail: handleDetail,
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
    </div>
    </PublicAdminShell>
  );
};

export default Events;
