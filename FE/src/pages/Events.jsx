import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import EventDiscoveryCard from '../components/EventDiscoveryCard';
import AppSelect from '../components/ui/AppSelect';
import PublicAdminShell from '../layouts/PublicAdminShell';
import SiteFooter from '../components/SiteFooter';
import useUserProfile from '../hooks/useUserProfile';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { getUserRole, isAdminRole } from '../utils/auth';
import { isPureCtsvStaff, resolveDiscoveryCardProps } from '../utils/publicEventStaffAccess';
import {
  CATEGORY_FILTERS,
  STATE_FILTERS,
  ORGANIZER_FILTERS,
  FIGMA_SAMPLE_EVENTS,
  mapApiEventToCard,
  filterEventsByCategory,
  filterEventsBySearch,
  filterEventsByState,
  filterEventsByOrganizer,
  sortEventsByStatePriority,
} from '../data/eventDiscoveryData';
import { useTranslation } from '../i18n/I18nContext';
import { mapSelectOptions, resolveLabel } from '../i18n/helpers';

const PAGE_SIZE = 6;
const USE_FIGMA_FALLBACK = false;
const DEFAULT_STATE_FILTER = 'open';

const Events = ({ showToast }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const organizerSelectOptions = useMemo(
    () =>
      ORGANIZER_FILTERS.map((f) => ({
        value: f.id,
        label: resolveLabel(f, t),
      })),
    [t],
  );
  const categorySelectOptions = useMemo(() => mapSelectOptions(CATEGORY_FILTERS, t), [t]);
  const [events, setEvents] = useState(USE_FIGMA_FALLBACK ? FIGMA_SAMPLE_EVENTS : []);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [organizerFilter, setOrganizerFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState(DEFAULT_STATE_FILTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { isLoggedIn, userProfile } = useUserProfile();
  const role = userProfile.role || getUserRole();
  const isAdminViewer = isLoggedIn && isAdminRole(role);
  const isCtsvStaff = isLoggedIn && isPureCtsvStaff(role);

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
        showToast?.(t('events.loadFail'), 'error');
      })
      .finally(() => setLoading(false));
  }, [showToast, isLoggedIn, userProfile.role]);

  const filteredEvents = useMemo(() => {
    let result = filterEventsByState(events, stateFilter);
    result = filterEventsByOrganizer(result, organizerFilter);
    result = filterEventsByCategory(result, activeFilter);
    result = filterEventsBySearch(result, searchQuery);
    return sortEventsByStatePriority(result);
  }, [events, stateFilter, organizerFilter, activeFilter, searchQuery]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;

  const hasSecondaryFilters = organizerFilter !== 'all' || activeFilter !== 'all';

  const resetFilters = () => {
    setActiveFilter('all');
    setOrganizerFilter('all');
    setStateFilter(DEFAULT_STATE_FILTER);
    setSearchQuery('');
    setVisibleCount(PAGE_SIZE);
  };

  const handleRegister = async (event) => {
    if (event.cardState === 'postponed') {
      handleDetail(event);
      return;
    }

    if (event.cardState === 'expired') {
      showToast(t('home.toast.eventEnded'), 'error');
      return;
    }

    if (!isLoggedIn) {
      showToast(t('home.toast.loginRequired'), 'error');
      setTimeout(() => navigate('/login'), 1200);
      return;
    }

    if (event.cardState === 'registered' || event.registered) {
      showToast(t('events.toast.ticketDev'), 'success');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/events/${event.id}/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || t('home.toast.registerFail'), 'error');
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
      showToast(data.message || t('home.toast.registerSuccess'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('events.toast.serverError'), 'error');
    }
  };

  const handleDetail = (event) => {
    navigate(`/events/${event.id}`);
  };

  return (
    <PublicAdminShell
      activeNav="events"
      searchPlaceholder={t('header.searchEvents')}
      searchValue={searchQuery}
      onSearchChange={(value) => {
        setSearchQuery(value);
        setVisibleCount(PAGE_SIZE);
      }}
    >
    <div className={`events-page home-layout${isAdminViewer || isCtsvStaff ? ' events-page--admin-view' : ''}`}>
      <main className="events-page__main">
        <section className="events-page__hero">
          <h1>
            {isAdminViewer
              ? t('events.hero.admin')
              : isCtsvStaff
                ? t('events.hero.ctsv')
                : t('events.hero.student')}
          </h1>
          <p>
            {isAdminViewer
              ? t('events.desc.admin')
              : isCtsvStaff
                ? t('events.desc.ctsv')
                : t('events.desc.student')}
          </p>
        </section>

        <section className="events-page__filter-bar" aria-label={t('events.filterBar')}>
          <div className="events-page__filter-bar-main">
            <div className="events-page__state-filters" role="group" aria-label={t('events.filter.state')}>
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
                  {resolveLabel(filter, t)}
                </button>
              ))}
            </div>

            <div className="events-page__filter-dropdowns">
              <div className="events-page__filter-field">
                <span className="events-page__filter-field-label" id="events-organizer-filter-label">
                  {t('events.filter.organizer')}
                </span>
                <AppSelect
                  id="events-organizer-filter"
                  aria-labelledby="events-organizer-filter-label"
                  value={organizerFilter}
                  onChange={(e) => {
                    setOrganizerFilter(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  options={organizerSelectOptions}
                  fullWidth={false}
                  className="events-page__filter-select"
                />
              </div>
              <div className="events-page__filter-field">
                <span className="events-page__filter-field-label" id="events-category-filter-label">
                  {t('events.filter.category')}
                </span>
                <AppSelect
                  id="events-category-filter"
                  aria-labelledby="events-category-filter-label"
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  options={categorySelectOptions}
                  fullWidth={false}
                  className="events-page__filter-select"
                />
              </div>
              {hasSecondaryFilters && (
                <button type="button" className="events-page__filter-clear" onClick={resetFilters}>
                  {t('events.filter.clear')}
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
              {stateFilter === 'expired' && t('events.empty.expired')}
              {stateFilter === 'postponed' && t('events.empty.postponed')}
              {stateFilter === 'open' && t('events.empty.open')}
              {organizerFilter !== 'all' && t('events.empty.tryOther')}
            </p>
            <button type="button" className="events-page__reset-btn" onClick={resetFilters}>
              {t('events.resetFilters')}
            </button>
          </div>
        ) : (
          <section className="event-discovery-grid">
            {visibleEvents.map((event) => {
              const cardProps = resolveDiscoveryCardProps({
                event,
                isCtsvStaff,
                isAdminViewer,
                onDetail: handleDetail,
                onRegister: handleRegister,
                onManageNavigate: (path) => navigate(path),
              });
              return (
                <EventDiscoveryCard
                  key={event.id}
                  event={event}
                  onDetail={cardProps.onDetail}
                  onPrimaryAction={cardProps.onPrimaryAction}
                  onManage={cardProps.onManage}
                  manageLabel={cardProps.manageLabel}
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
              {t('events.loadMore')}
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
