import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buildMonthCells,
  formatMonthLabel,
  getCalendarWeekdays,
  mapCtsvCalendarEvent,
  startOfDay,
} from '../../utils/ctsvCalendar';
import { useTranslation } from '../../i18n/I18nContext';
import { resolveLabel } from '../../i18n/helpers';
import { statusClass } from '../../utils/eventStatus';

const DEFAULT_SOURCE_FILTERS = [
  { id: 'all', labelKey: 'admin.calendar.filter.all' },
  { id: 'school', labelKey: 'admin.calendar.filter.school' },
  { id: 'partner', labelKey: 'admin.calendar.filter.partner' },
  { id: 'club', labelKey: 'admin.calendar.filter.club' },
];

const EventCalendarPage = ({
  showToast,
  fetchEvents,
  resolveEventLink,
  eyebrow,
  title,
  description,
  sourceFilters,
  statusFilters = [],
  computeStats,
}) => {
  const { t, language } = useTranslation();
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);

  const resolvedSourceFilters = useMemo(() => {
    const filters = sourceFilters || DEFAULT_SOURCE_FILTERS;
    return filters.map((f) => ({ ...f, label: resolveLabel(f, t) }));
  }, [sourceFilters, t]);

  const resolvedStatusFilters = useMemo(
    () => statusFilters.map((f) => ({ ...f, label: resolveLabel(f, t) })),
    [statusFilters, t],
  );

  const weekdays = useMemo(() => getCalendarWeekdays(t, language), [t, language]);
  const dateLocale = language === 'en' ? 'en-US' : 'vi-VN';

  useEffect(() => {
    setLoading(true);
    fetchEvents()
      .then((d) => setRawEvents((d.events || []).map((ev) => mapCtsvCalendarEvent(ev, t)).filter((e) => e.date)))
      .catch(() => {
        setRawEvents([]);
        showToast?.(t('admin.calendar.loadFail'), 'error');
      })
      .finally(() => setLoading(false));
  }, [fetchEvents, showToast, t, language]);

  const events = useMemo(() => {
    let list = rawEvents;
    if (sourceFilter !== 'all') {
      list = list.filter((e) => e.source === sourceFilter);
    }
    if (statusFilter === 'pending_admin') {
      list = list.filter((e) => e.statusKey === 'pending_admin');
    } else if (statusFilter === 'pending_any') {
      list = list.filter((e) => e.isPending);
    }
    return list;
  }, [rawEvents, sourceFilter, statusFilter]);

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const monthLabel = formatMonthLabel(viewDate, language);
  const { cells, eventsInMonth } = useMemo(
    () => buildMonthCells(viewDate, events, todayStart),
    [viewDate, events, todayStart],
  );

  const sidebarEvents = useMemo(() => {
    const list = selectedDay
      ? eventsInMonth.filter((e) => e.date.getDate() === selectedDay)
      : eventsInMonth;
    return [...list].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [eventsInMonth, selectedDay]);

  const stats = useMemo(() => {
    if (computeStats) return computeStats(eventsInMonth);
    const pending = eventsInMonth.filter((e) => e.isPending).length;
    const school = eventsInMonth.filter((e) => e.source === 'school').length;
    return { total: eventsInMonth.length, pending, school, pendingAdmin: 0 };
  }, [eventsInMonth, computeStats]);

  const goPrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const goNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const goToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  };

  const isViewingCurrentMonth =
    viewDate.getFullYear() === new Date().getFullYear() &&
    viewDate.getMonth() === new Date().getMonth();

  const allFilters = [...resolvedSourceFilters, ...resolvedStatusFilters];

  const selectedDayLabel = selectedDay
    ? t('admin.calendar.sidebar.dayTitle', {
        date: `${String(selectedDay).padStart(2, '0')}/${String(viewDate.getMonth() + 1).padStart(2, '0')}/${viewDate.getFullYear()}`,
      })
    : t('admin.calendar.sidebar.monthEvents');

  return (
    <div className="ctsv-calendar-page">
      <header className="ctsv-events-hero ctsv-cal-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : stats.total}</span>
            <span className="ctsv-events-hero-stat-label">{t('admin.calendar.eventsInMonth')}</span>
          </div>
          {!loading && stats.pendingAdmin > 0 && (
            <p className="ctsv-cal-hero-pending">
              {t('admin.calendar.pendingAdminCount', { count: stats.pendingAdmin })}
            </p>
          )}
          {!loading && stats.pending > 0 && stats.pendingAdmin === 0 && (
            <p className="ctsv-cal-hero-pending">
              {t('admin.calendar.pendingCount', { count: stats.pending })}
            </p>
          )}
        </div>
      </header>

      <section className="ctsv-cal-toolbar-card">
        <div className="ctsv-cal-toolbar-top">
          <div className="student-calendar-nav ctsv-cal-nav">
            <button
              type="button"
              className="student-calendar-nav__btn"
              onClick={goPrevMonth}
              aria-label={t('admin.calendar.prevMonth')}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            <span className="student-calendar-nav__label">{monthLabel}</span>
            <button
              type="button"
              className="student-calendar-nav__btn"
              onClick={goNextMonth}
              aria-label={t('admin.calendar.nextMonth')}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            {!isViewingCurrentMonth && (
              <button type="button" className="student-calendar-nav__today" onClick={goToday}>
                {t('admin.calendar.today')}
              </button>
            )}
          </div>

          <div className="ctsv-cal-source-filters" role="group" aria-label={t('admin.calendar.filterAria')}>
            {allFilters.map((f) => {
              const isStatus = f.id === 'pending_admin' || f.id === 'pending_any';
              const active = isStatus ? statusFilter === f.id : sourceFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`ctsv-cal-filter-chip ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    if (isStatus) {
                      setStatusFilter((prev) => (prev === f.id ? 'all' : f.id));
                    } else {
                      setSourceFilter(f.id);
                      setStatusFilter('all');
                    }
                    setSelectedDay(null);
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="ctsv-cal-legend">
          <span className="ctsv-cal-legend-item">
            <i className="ctsv-cal-legend-dot ctsv-cal-legend-dot--school" /> {t('admin.calendar.legend.school')}
          </span>
          <span className="ctsv-cal-legend-item">
            <i className="ctsv-cal-legend-dot ctsv-cal-legend-dot--partner" /> {t('admin.calendar.legend.partner')}
          </span>
          <span className="ctsv-cal-legend-item">
            <i className="ctsv-cal-legend-dot ctsv-cal-legend-dot--club" /> {t('admin.calendar.legend.club')}
          </span>
          <span className="ctsv-cal-legend-item">
            <i className="ctsv-cal-legend-dot ctsv-cal-legend-dot--pending" /> {t('admin.calendar.legend.pending')}
          </span>
        </div>
      </section>

      <div className="ctsv-cal-layout">
        <div className="student-calendar ctsv-cal-grid" aria-busy={loading}>
          <div className="student-calendar__weekdays">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="student-calendar__grid">
            {cells.map((cell, index) => (
              <div
                key={cell ? `day-${cell.day}` : `empty-${index}`}
                className={[
                  'student-calendar__cell',
                  'ctsv-cal-cell',
                  cell?.isToday ? 'student-calendar__cell--today' : '',
                  cell?.isPast ? 'student-calendar__cell--past' : '',
                  cell?.isFuture ? 'student-calendar__cell--future' : '',
                  cell && selectedDay === cell.day ? 'ctsv-cal-cell--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role={cell ? 'button' : undefined}
                tabIndex={cell ? 0 : undefined}
                onClick={cell ? () => setSelectedDay(cell.day) : undefined}
                onKeyDown={
                  cell
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDay(cell.day);
                        }
                      }
                    : undefined
                }
              >
                {cell && (
                  <>
                    <span className={`student-calendar__day ${cell.isToday ? 'ctsv-cal-day--today' : ''}`}>
                      {cell.day}
                    </span>
                    <div className="ctsv-cal-cell-events">
                      {cell.events.slice(0, 3).map((event) => (
                        <Link
                          key={event.id}
                          to={resolveEventLink(event)}
                          className="ctsv-cal-event-pill"
                          style={{
                            backgroundColor: event.colors.bg,
                            borderColor: event.colors.border,
                            color: event.colors.text,
                          }}
                          title={`${event.time} · ${event.title}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="ctsv-cal-event-pill-time">{event.time}</span>
                          <span className="ctsv-cal-event-pill-title">{event.title}</span>
                        </Link>
                      ))}
                      {cell.events.length > 3 && (
                        <button
                          type="button"
                          className="ctsv-cal-more"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDay(cell.day);
                          }}
                        >
                          {t('admin.calendar.moreEvents', { count: cell.events.length - 3 })}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="ctsv-cal-sidebar">
          <div className="ctsv-cal-sidebar-head">
            <h2>{selectedDayLabel}</h2>
            {selectedDay && (
              <button type="button" className="ctsv-cal-sidebar-clear" onClick={() => setSelectedDay(null)}>
                {t('admin.calendar.sidebar.viewMonth')}
              </button>
            )}
          </div>

          {loading ? (
            <p className="ctsv-cal-sidebar-hint">{t('admin.calendar.loading')}</p>
          ) : sidebarEvents.length === 0 ? (
            <p className="ctsv-cal-sidebar-hint">{t('admin.calendar.empty')}</p>
          ) : (
            <ul className="ctsv-cal-sidebar-list">
              {sidebarEvents.map((event) => (
                <li key={event.id}>
                  <Link to={resolveEventLink(event)} className="ctsv-cal-sidebar-item">
                    <span
                      className="ctsv-cal-sidebar-dot"
                      style={{ backgroundColor: event.colors.border }}
                    />
                    <div className="ctsv-cal-sidebar-body">
                      <strong>{event.title}</strong>
                      <p>
                        {event.date.toLocaleDateString(dateLocale)} · {event.time}
                        {event.location ? ` · ${event.location}` : ''}
                      </p>
                      <div className="ctsv-cal-sidebar-tags">
                        <span className={`ctsv-cal-source-tag ctsv-cal-source-tag--${event.source}`}>
                          {event.sourceLabel}
                        </span>
                        <span className={`status-pill ${statusClass(event.status, event.statusKey)}`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
};

export default EventCalendarPage;
