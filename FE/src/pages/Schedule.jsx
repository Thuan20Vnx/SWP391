import React, { useEffect, useMemo, useState } from 'react';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { scheduleEvents as mockScheduleEvents } from '../data/studentMockData';

const WEEKDAYS = ['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CN'];
const VIEW_MODES = ['Tháng', 'Tuần', 'Ngày'];

const EVENT_COLORS = ['#f26f21', '#0ea5e9', '#8b5cf6', '#f59e0b', '#16a34a', '#9333ea'];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const formatMonthLabel = (date) => {
  const label = date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const formatEventTime = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const mapApiEventToSchedule = (event, index) => ({
  id: event.id || event.eventId,
  date: new Date(event.startDate),
  title: event.title,
  time: formatEventTime(event.startDate),
  color: EVENT_COLORS[index % EVENT_COLORS.length],
  location: event.location,
});

const mapMockToSchedule = (event, index) => ({
  id: event.id,
  date: new Date(2026, 4, event.day),
  title: event.title,
  time: event.time,
  color: event.color || EVENT_COLORS[index % EVENT_COLORS.length],
  location: '',
});

const Schedule = ({ showToast }) => {
  const [viewMode, setViewMode] = useState('Tháng');
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayStart = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders(false);
        const [upcomingRes, attendedRes] = await Promise.all([
          fetch(`${API_BASE}/api/user/my-events?tab=upcoming`, { headers }),
          fetch(`${API_BASE}/api/user/my-events?tab=attended`, { headers }),
        ]);

        if (upcomingRes.status === 401) {
          setEvents(mockScheduleEvents.map(mapMockToSchedule));
          return;
        }

        const upcomingData = upcomingRes.ok ? await upcomingRes.json() : { events: [] };
        const attendedData = attendedRes.ok ? await attendedRes.json() : { events: [] };
        const merged = [...(upcomingData.events || []), ...(attendedData.events || [])];

        if (merged.length > 0) {
          setEvents(merged.map(mapApiEventToSchedule));
        } else {
          setEvents(mockScheduleEvents.map(mapMockToSchedule));
        }
      } catch {
        setEvents(mockScheduleEvents.map(mapMockToSchedule));
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const monthLabel = formatMonthLabel(viewDate);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const eventsInMonth = useMemo(
    () =>
      events.filter(
        (event) =>
          event.date.getFullYear() === viewYear && event.date.getMonth() === viewMonth
      ),
    [events, viewYear, viewMonth]
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(viewYear, viewMonth, day);
      const cellStart = startOfDay(cellDate);
      cells.push({
        day,
        date: cellDate,
        events: eventsInMonth.filter((event) => event.date.getDate() === day),
        isToday: cellStart === todayStart,
        isPast: cellStart < todayStart,
        isFuture: cellStart > todayStart,
      });
    }
    return cells;
  }, [viewYear, viewMonth, eventsInMonth, todayStart]);

  const sidebarEvents = useMemo(
    () =>
      [...eventsInMonth].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [eventsInMonth]
  );

  const goPrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const isViewingCurrentMonth = viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth();

  const handleViewModeChange = (mode) => {
    if (mode !== 'Tháng') {
      showToast?.('Chế độ Tuần/Ngày đang được phát triển.', 'info');
      return;
    }
    setViewMode(mode);
  };

  return (
    <StudentDashboardLayout
      activeMenu="schedule"
      pageTitle="Lịch trình sự kiện"
      pageSubtitle={monthLabel}
      showToast={showToast}
    >
      <div className="student-schedule-toolbar">
        <div className="student-calendar-nav">
          <button type="button" className="student-calendar-nav__btn" onClick={goPrevMonth} aria-label="Tháng trước">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
          <span className="student-calendar-nav__label">{monthLabel}</span>
          <button type="button" className="student-calendar-nav__btn" onClick={goNextMonth} aria-label="Tháng sau">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
          {!isViewingCurrentMonth && (
            <button type="button" className="student-calendar-nav__today" onClick={goToday}>
              Hôm nay
            </button>
          )}
        </div>

        <div className="student-view-toggle">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`student-view-toggle__btn ${viewMode === mode ? 'student-view-toggle__btn--active' : ''}`}
              onClick={() => handleViewModeChange(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="student-schedule-layout">
        <div className="student-calendar">
          <div className="student-calendar__weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="student-calendar__grid">
            {calendarDays.map((cell, index) => (
              <div
                key={cell ? `day-${cell.day}` : `empty-${index}`}
                className={[
                  'student-calendar__cell',
                  cell?.isToday ? 'student-calendar__cell--today' : '',
                  cell?.isPast ? 'student-calendar__cell--past' : '',
                  cell?.isFuture ? 'student-calendar__cell--future' : '',
                ].filter(Boolean).join(' ')}
              >
                {cell && (
                  <>
                    <span className="student-calendar__day">{cell.day}</span>
                    {cell.events.map((event) => (
                      <div
                        key={event.id}
                        className="student-calendar__event"
                        style={{ backgroundColor: `${event.color}22`, borderColor: event.color, color: event.color }}
                        title={event.location || event.title}
                      >
                        {event.time} · {event.title}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="student-schedule-sidebar">
          <h2>Sự kiện trong tháng</h2>
          {loading ? (
            <p className="student-schedule-sidebar__hint">Đang tải...</p>
          ) : sidebarEvents.length === 0 ? (
            <p className="student-schedule-sidebar__hint">Không có sự kiện trong tháng này.</p>
          ) : (
            sidebarEvents.map((event) => {
              const isPast = startOfDay(event.date) < todayStart;
              return (
                <article
                  key={event.id}
                  className={`student-schedule-item ${isPast ? 'student-schedule-item--past' : ''}`}
                >
                  <span className="student-schedule-item__dot" style={{ backgroundColor: event.color }} />
                  <div>
                    <strong>{event.title}</strong>
                    <p>
                      {event.date.toLocaleDateString('vi-VN')} · {event.time}
                    </p>
                  </div>
                </article>
              );
            })
          )}
        </aside>
      </div>
    </StudentDashboardLayout>
  );
};

export default Schedule;
