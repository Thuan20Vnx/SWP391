import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchIcpdpCalendar, ICPDP_MOCK_EVENTS } from '../../services/icpdpApi';
import {
  WEEKDAYS_VI,
  buildMonthCells,
  formatMonthLabel,
  mapCtsvCalendarEvent,
  startOfDay
} from '../../utils/ctsvCalendar';
import { statusClass } from '../../utils/eventStatus';

const SOURCE_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'school', label: 'Cấp trường' },
  { id: 'partner', label: 'Đối tác' },
  { id: 'club', label: 'CLB' }
];

const IcpdpCalendar = () => {
  const { showToast } = useOutletContext() || {};
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchIcpdpCalendar()
      .then((d) => setRawEvents((d.events || []).map(mapCtsvCalendarEvent).filter((e) => e.date)))
      .catch(() => {
        setRawEvents(ICPDP_MOCK_EVENTS.map(mapCtsvCalendarEvent).filter((e) => e.date));
        showToast?.('Dùng dữ liệu demo.', 'info');
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const events = useMemo(() => {
    if (sourceFilter === 'all') return rawEvents;
    return rawEvents.filter((e) => e.source === sourceFilter);
  }, [rawEvents, sourceFilter]);

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const monthLabel = formatMonthLabel(viewDate);
  const { cells, eventsInMonth } = useMemo(
    () => buildMonthCells(viewDate, events, todayStart),
    [viewDate, events, todayStart]
  );

  const sidebarEvents = useMemo(() => {
    const list = selectedDay
      ? eventsInMonth.filter((e) => e.date.getDate() === selectedDay)
      : eventsInMonth;
    return [...list].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [eventsInMonth, selectedDay]);

  const stats = useMemo(() => {
    const pending = eventsInMonth.filter((e) => e.isPending).length;
    const club = eventsInMonth.filter((e) => e.source === 'club').length;
    return { total: eventsInMonth.length, pending, club };
  }, [eventsInMonth]);

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

  return (
    <div className="ctsv-calendar-page">
      <header className="ctsv-events-hero ctsv-cal-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">Lịch IC-PDP</span>
          <h1>Lịch sự kiện toàn trường</h1>
          <p>
            Giám sát thời gian tổ chức sự kiện của Cấp trường, Đối tác và CLB để điều phối các sự kiện CLB không bị trùng lặp.
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : stats.total}</span>
            <span className="ctsv-events-hero-stat-label">Sự kiện trong tháng</span>
          </div>
          {!loading && stats.club > 0 && (
            <p className="ctsv-cal-hero-pending" style={{ color: 'var(--icpdp-accent)' }}>{stats.club} sự kiện CLB</p>
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

          <div className="ctsv-cal-source-filters" role="group" aria-label="Lọc nguồn sự kiện">
            {SOURCE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`ctsv-cal-filter-chip ${sourceFilter === f.id ? 'is-active' : ''}`}
                onClick={() => {
                  setSourceFilter(f.id);
                  setSelectedDay(null);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ctsv-cal-legend">
          <span className="ctsv-cal-legend-item">
            <i className="ctsv-cal-legend-dot ctsv-cal-legend-dot--school" /> Cấp trường
          </span>
          <span className="ctsv-cal-legend-item">
            <i className="ctsv-cal-legend-dot ctsv-cal-legend-dot--partner" /> Đối tác
          </span>
          <span className="ctsv-cal-legend-item">
            <i className="ctsv-cal-legend-dot ctsv-cal-legend-dot--club" /> CLB
          </span>
          <span className="ctsv-cal-legend-item">
            <i className="ctsv-cal-legend-dot ctsv-cal-legend-dot--pending" /> Chờ duyệt
          </span>
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
                  cell && selectedDay === cell.day ? 'ctsv-cal-cell--selected' : ''
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
                          to={`/icpdp/events/${event.id}`}
                          className="ctsv-cal-event-pill"
                          style={{
                            backgroundColor: event.colors.bg,
                            borderColor: event.colors.border,
                            color: event.colors.text
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
                          +{cell.events.length - 3} sự kiện
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
                  <Link to={`/icpdp/events/${event.id}`} className="ctsv-cal-sidebar-item">
                    <span
                      className="ctsv-cal-sidebar-dot"
                      style={{ backgroundColor: event.colors.border }}
                    />
                    <div className="ctsv-cal-sidebar-body">
                      <strong>{event.title}</strong>
                      <p>
                        {event.date.toLocaleDateString('vi-VN')} · {event.time}
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

export default IcpdpCalendar;
