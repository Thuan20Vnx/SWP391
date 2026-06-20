import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { getGreeting } from '../data/studentMockData';
import { API_BASE, getAuthHeaders } from '../utils/api';

const StudentDashboard = ({ showToast }) => {
  const navigate = useNavigate();
  const [fullname, setFullname] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setFullname(data.user?.fullname || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/user/my-events?tab=upcoming`, { headers: getAuthHeaders(false) }),
      fetch(`${API_BASE}/api/user/my-events?tab=attended`, { headers: getAuthHeaders(false) }),
    ])
      .then(async ([upRes, atRes]) => {
        const upData = upRes.ok ? await upRes.json() : { events: [] };
        const atData = atRes.ok ? await atRes.json() : { events: [] };
        setUpcomingEvents(upData.events || []);
        setAttendedEvents(atData.events || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Sự kiện sắp tới', value: String(upcomingEvents.length), trendUp: true, trend: 'đã đăng ký' },
    { label: 'Sự kiện đã tham gia', value: String(attendedEvents.length), trendUp: true, trend: 'hoàn thành' },
  ];

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const todayTimeline = upcomingEvents.filter((ev) => {
    const d = new Date(ev.startDate);
    return d >= todayStart && d <= todayEnd;
  });

  const recommendations = upcomingEvents.slice(0, 4);

  return (
    <StudentDashboardLayout
      activeMenu="dashboard"
      pageTitle={getGreeting(fullname)}
      pageSubtitle={
        todayTimeline.length > 0
          ? `Hôm nay bạn có ${todayTimeline.length} sự kiện cần tham gia. Hãy chuẩn bị nhé.`
          : 'Chào mừng bạn trở lại! Khám phá các sự kiện mới nhé.'
      }
      breadcrumbLabel="Tổng quan"
      showToast={showToast}
    >
      <section className="student-stats-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="student-stat-card">
            <div className={`student-stat-trend ${stat.trendUp ? 'student-stat-trend--up' : ''}`}>
              {stat.trend}
            </div>
            <p className="student-stat-label">{stat.label}</p>
            <strong className="student-stat-value">{loading ? '—' : stat.value}</strong>
          </article>
        ))}
      </section>

      <div className="student-dashboard-columns">
        <section className="student-panel">
          <div className="student-panel__header">
            <h2>Lịch trình hôm nay</h2>
            <button type="button" className="student-link-btn" onClick={() => navigate('/schedule')}>
              Xem lịch chi tiết
            </button>
          </div>
          <div className="student-timeline">
            {loading ? (
              <p className="student-empty-hint">Đang tải...</p>
            ) : todayTimeline.length === 0 ? (
              <p className="student-empty-hint">Không có sự kiện nào hôm nay.</p>
            ) : (
              todayTimeline.map((item) => {
                const d = new Date(item.startDate);
                return (
                  <article key={item.id || item.eventId} className="student-timeline-item">
                    <div className="student-timeline-time">
                      <strong>{d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>
                      <span>{d.toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="student-timeline-body">
                      <span className="student-badge student-badge--primary">SẮP DIỄN RA</span>
                      <h3>{item.title}</h3>
                      <p>{item.location}</p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="student-panel">
          <div className="student-panel__header">
            <h2>Gợi ý tiếp theo</h2>
            <Link to="/events" className="student-link-btn">Khám phá thêm</Link>
          </div>
          <div className="student-mini-cards">
            {loading ? (
              <p className="student-empty-hint">Đang tải...</p>
            ) : recommendations.length === 0 ? (
              <p className="student-empty-hint">Chưa có sự kiện đã đăng ký.</p>
            ) : (
              recommendations.map((event) => (
                <article key={event.id || event.eventId} className="student-mini-card">
                  <img src={event.thumbnail || event.image || ''} alt="" />
                  <div>
                    <span className="student-badge student-badge--muted">{event.category || 'Sự kiện'}</span>
                    <h3>{event.title}</h3>
                    <p>{event.startDate ? new Date(event.startDate).toLocaleDateString('vi-VN') : ''}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </StudentDashboardLayout>
  );
};

export default StudentDashboard;
