import React, { useMemo, useState } from 'react';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { scheduleEvents } from '../data/studentMockData';

const WEEKDAYS = ['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CN'];
const VIEW_MODES = ['Tháng', 'Tuần', 'Ngày'];

const Schedule = ({ showToast }) => {
  const [viewMode, setViewMode] = useState('Tháng');
  const now = new Date(2026, 4, 28);
  const monthLabel = `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;

  const calendarDays = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        day,
        events: scheduleEvents.filter((event) => event.day === day),
        isToday: day === now.getDate(),
      });
    }
    return cells;
  }, [now]);

  return (
    <StudentDashboardLayout
      activeMenu="schedule"
      pageTitle="Lịch trình sự kiện"
      pageSubtitle={monthLabel}
      showToast={showToast}
    >
      <div className="student-schedule-toolbar">
        <div className="student-view-toggle">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`student-view-toggle__btn ${viewMode === mode ? 'student-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => showToast?.('Đồng bộ Google Calendar đang được phát triển.', 'info')}
        >
          Đồng bộ Google Calendar
        </button>
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
              className={`student-calendar__cell ${cell?.isToday ? 'student-calendar__cell--today' : ''}`}
            >
              {cell && (
                <>
                  <span className="student-calendar__day">{cell.day}</span>
                  {cell.events.map((event) => (
                    <div
                      key={event.id}
                      className="student-calendar__event"
                      style={{ backgroundColor: `${event.color}22`, borderColor: event.color, color: event.color }}
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
        {scheduleEvents.map((event) => (
          <article key={event.id} className="student-schedule-item">
            <span className="student-schedule-item__dot" style={{ backgroundColor: event.color }} />
            <div>
              <strong>{event.title}</strong>
              <p>Ngày {event.day}/05/2026 · {event.time}</p>
            </div>
          </article>
        ))}
      </aside>
      </div>
    </StudentDashboardLayout>
  );
};

export default Schedule;
