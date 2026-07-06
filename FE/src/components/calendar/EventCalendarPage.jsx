import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CALENDAR_STATUS_LEGEND,
  WEEKDAYS_VI,
  buildMonthCells,
  formatMonthLabel,
  mapCtsvCalendarEvent,
  startOfDay,
} from '../../utils/ctsvCalendar';
import { statusClass } from '../../utils/eventStatus';

const DEFAULT_SOURCE_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'school', label: 'Cấp trường' },
  { id: 'partner', label: 'Đối tác' },
  { id: 'club', label: 'CLB' },
];

const EventCalendarPage = ({
  showToast,
  fetchEvents,
  resolveEventLink,
  eyebrow = 'Lịch sự kiện',
  title = 'Lịch sự kiện toàn trường',
  description = 'Tổng quan sự kiện theo tháng.',
  sourceFilters = DEFAULT_SOURCE_FILTERS,
  statusFilters = [],
  computeStats,
}) => {
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchEvents()
      .then((d) => setRawEvents((d.events || []).map(mapCtsvCalendarEvent).filter((e) => e.date)))
      .catch(() => {
        setRawEvents([]);
        showToast?.('Không tải được lịch sự kiện.', 'error');
      })
      .finally(() => setLoading(false));
  }, [fetchEvents, showToast]);

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
  const monthLabel = formatMonthLabel(viewDate);
  const { cells, eventsInMonth } = useMemo(
    () => buildMonthCells(viewDate, events, todayStart),
    [viewDate, events, todayStart],
  );

  const sidebarEvents = useMemo(() => {
    // Sự kiện nhiều ngày: hiển thị nếu ngày đã chọn nằm trong khoảng diễn ra.
    const list = selectedDay
      ? eventsInMonth.filter((e) => selectedDay >= e.startDay && selectedDay <= e.endDay)
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

  const allFilters = [...sourceFilters, ...statusFilters];

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
            <span className="ctsv-events-hero-stat-label">Sự kiện trong tháng</span>
          </div>
          {!loading && stats.pendingAdmin > 0 && (
            <p className="ctsv-cal-hero-pending">{stats.pendingAdmin} chờ Admin duyệt</p>
          )}
          {!loading && stats.pending > 0 && stats.pendingAdmin === 0 && (
            <p className="ctsv-cal-hero-pending">{stats.pending} chờ duyệt</p>
          )}
        </div>
      </header>

      <section className="ctsv-cal-toolbar-card">
        <div className="ctsv-cal-toolbar-top">
          <div className="student-calendar-nav ctsv-cal-nav">
            <button type="button" className="student-calendar-nav__btn" onClick={goPrevMonth} aria-label="Tháng trước">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            <span className="student-calendar-nav__label">{monthLabel}</span>
            <button type="button" className="student-calendar-nav__btn" onClick={goNextMonth} aria-label="Tháng sau">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            {!isViewingCurrentMonth && (
              <button type="button" className="student-calendar-nav__today" onClick={goToday}>
                Hôm nay
              </button>
            )}
          </div>

          <div className="ctsv-cal-source-filters" role="group" aria-label="Lọc lịch">
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
          {CALENDAR_STATUS_LEGEND.map((item) => (
            <span key={item.id} className="ctsv-cal-legend-item">
              <i className="ctsv-cal-legend-dot" style={{ backgroundColor: item.color }} /> {item.label}
            </span>
          ))}
        </div>
      </section>

      <div className="ctsv-cal-layout">
        <div className="student-calendar ctsv-cal-grid" aria-busy={loading}>
          <div className="student-calendar__weekdays">
            {WEEKDAYS_VI.map((day) => (
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
                    <div className="ctsv-cal-lanes">
                      {Array.from({ length: cell.laneCount }).map((_, laneIndex) => {
                        const seg = cell.lanes[laneIndex];
                        if (!seg) {
                          return <span key={`lane-${laneIndex}`} className="ctsv-cal-lane ctsv-cal-lane--empty" />;
                        }
                        const { event } = seg;
                        // Chỉ hiện chữ ở đầu đoạn (đầu sự kiện hoặc đầu tuần) để thanh dài không lặp chữ.
                        const showLabel = seg.isSegmentStart || seg.isWeekStart;
                        const barClass = [
                          'ctsv-cal-lane',
                          'ctsv-cal-bar',
                          seg.multiDay ? 'ctsv-cal-bar--span' : 'ctsv-cal-bar--single',
                          seg.isStart ? 'is-start' : '',
                          seg.isEnd ? 'is-end' : '',
                        ]
                          .filter(Boolean)
                          .join(' ');
                        return (
                          <Link
                            key={event.id}
                            to={resolveEventLink(event)}
                            className={barClass}
                            style={{
                              backgroundColor: event.colors.bg,
                              borderColor: event.colors.border,
                              color: event.colors.text,
                            }}
                            title={`${event.title}${event.time ? ` · ${event.time}` : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {showLabel ? (
                              <span className="ctsv-cal-bar-label">
                                {!seg.multiDay && event.time ? (
                                  <span className="ctsv-cal-bar-time">{event.time}</span>
                                ) : null}
                                <span className="ctsv-cal-bar-title">{event.title}</span>
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                      {cell.hiddenCount > 0 && (
                        <button
                          type="button"
                          className="ctsv-cal-more"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDay(cell.day);
                          }}
                        >
                          +{cell.hiddenCount} sự kiện
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
            <h2>
              {selectedDay
                ? `Ngày ${String(selectedDay).padStart(2, '0')}/${String(viewDate.getMonth() + 1).padStart(2, '0')}/${viewDate.getFullYear()}`
                : 'Sự kiện trong tháng'}
            </h2>
            {selectedDay && (
              <button type="button" className="ctsv-cal-sidebar-clear" onClick={() => setSelectedDay(null)}>
                Xem cả tháng
              </button>
            )}
          </div>

          {loading ? (
            <p className="ctsv-cal-sidebar-hint">Đang tải lịch…</p>
          ) : sidebarEvents.length === 0 ? (
            <p className="ctsv-cal-sidebar-hint">Không có sự kiện trong khoảng đã chọn.</p>
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
                        {event.multiDay
                          ? `${event.start.toLocaleDateString('vi-VN')} – ${event.end.toLocaleDateString('vi-VN')}`
                          : `${event.date.toLocaleDateString('vi-VN')}${event.time ? ` · ${event.time}` : ''}`}
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
