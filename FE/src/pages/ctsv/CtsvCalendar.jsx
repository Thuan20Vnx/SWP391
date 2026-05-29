import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCtsvCalendar } from '../../services/ctsvApi';
import { statusClass } from '../../utils/eventStatus';

const CtsvCalendar = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchCtsvCalendar()
      .then((d) => setEvents(d.events || []))
      .catch(() => setEvents([]));
  }, []);

  const byMonth = events.reduce((acc, ev) => {
    const key = ev.date?.slice(3) || 'Khác';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div className="ctsv-page">
      <h1>Lịch sự kiện toàn trường</h1>
      <p className="ctsv-muted">Tổng quan sự kiện đã duyệt và đang chờ xử lý.</p>

      {Object.keys(byMonth).length === 0 ? (
        <p className="ctsv-muted">Chưa có sự kiện trên lịch.</p>
      ) : (
        Object.entries(byMonth).map(([month, list]) => (
          <section key={month} className="ctsv-calendar-month">
            <h2>Tháng {month}</h2>
            <ul className="ctsv-calendar-list">
              {list.map((ev) => (
                <li key={ev.id}>
                  <span className="ctsv-cal-date">
                    {ev.date} {ev.time}
                  </span>
                  <Link to={`/ctsv/events/${ev.id}`}>{ev.title}</Link>
                  <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>{ev.status}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};

export default CtsvCalendar;
