import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCtsvEvents, fetchCtsvStats, MOCK_EVENTS, MOCK_STATS } from '../../services/ctsvApi';
import { isPendingApproval, statusClass } from '../../utils/eventStatus';

const CtsvDashboard = () => {
  const [stats, setStats] = useState(MOCK_STATS);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchCtsvStats()
      .then((d) => setStats(d.stats || MOCK_STATS))
      .catch(() => setStats(MOCK_STATS));

    fetchCtsvEvents()
      .then((d) => setEvents((d.events || []).slice(0, 6)))
      .catch(() => setEvents(MOCK_EVENTS.slice(0, 4)));
  }, []);

  return (
    <div className="ctsv-page">
      <div className="ctsv-page-header">
        <div>
          <h1>Bảng điều khiển CTSV</h1>
          <p>Thống kê dữ liệu sự kiện và sinh viên trong hệ thống.</p>
        </div>
        <Link to="/ctsv/reports" className="ctsv-btn-secondary">
          Xuất báo cáo
        </Link>
      </div>

      <div className="ctsv-stats-grid">
        {stats.map((item) => (
          <article key={item.label} className="ctsv-stat-card">
            <p className="ctsv-stat-label">{item.label}</p>
            <div className="ctsv-stat-value-row">
              <span className="ctsv-stat-value">{item.value}</span>
              <span className="ctsv-stat-trend">{item.trend}</span>
            </div>
          </article>
        ))}
      </div>

      <section className="ctsv-panel">
        <div className="ctsv-panel-header">
          <h2>Sự kiện gần đây</h2>
          <Link to="/ctsv/events">Xem tất cả</Link>
        </div>
        <div className="ctsv-table-wrap">
          <table className="ctsv-table">
            <thead>
              <tr>
                <th>Sự kiện</th>
                <th>Chủ đề</th>
                <th>Ngày</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.title}</td>
                  <td>{ev.category}</td>
                  <td>
                    {ev.date} {ev.time}
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>{ev.status}</span>
                  </td>
                  <td>
                    <Link
                      to={`/ctsv/events/${ev.id}`}
                      className="ctsv-link-btn"
                    >
                      {isPendingApproval(ev) ? 'Phê duyệt' : 'Chi tiết'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CtsvDashboard;
