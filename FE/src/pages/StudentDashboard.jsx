import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import {
  dashboardStats,
  todayTimeline,
  upcomingRecommendations,
  getGreeting,
} from '../data/studentMockData';
import { API_BASE, getAuthHeaders } from '../utils/api';

const StudentDashboard = ({ showToast }) => {
  const navigate = useNavigate();
  const [fullname, setFullname] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setFullname(data.user?.fullname || ''))
      .catch(() => {});
  }, []);

  return (
    <StudentDashboardLayout
      activeMenu="dashboard"
      pageTitle={getGreeting(fullname)}
      pageSubtitle="Hôm nay bạn có 2 sự kiện cần tham gia. Hãy chuẩn bị nhé."
      breadcrumbLabel="Tổng quan"
      showToast={showToast}
    >
      <section className="student-stats-grid">
        {dashboardStats.map((stat) => (
          <article key={stat.label} className="student-stat-card">
            <div className={`student-stat-trend ${stat.trendUp ? 'student-stat-trend--up' : ''}`}>
              {stat.trend}
            </div>
            <p className="student-stat-label">{stat.label}</p>
            <strong className="student-stat-value">{stat.value}</strong>
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
            {todayTimeline.map((item) => (
              <article key={item.id} className="student-timeline-item">
                <div className="student-timeline-time">
                  <strong>{item.time}</strong>
                  <span>{item.date}</span>
                </div>
                <div className="student-timeline-body">
                  <span className={`student-badge student-badge--${item.statusTone}`}>{item.status}</span>
                  <h3>{item.title}</h3>
                  <p>{item.location}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="student-panel">
          <div className="student-panel__header">
            <h2>Gợi ý tiếp theo</h2>
            <Link to="/events" className="student-link-btn">Khám phá thêm</Link>
          </div>
          <div className="student-mini-cards">
            {upcomingRecommendations.map((event) => (
              <article key={event.id} className="student-mini-card">
                <img src={event.image} alt="" />
                <div>
                  <span className="student-badge student-badge--muted">{event.category}</span>
                  <h3>{event.title}</h3>
                  <p>{event.date}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </StudentDashboardLayout>
  );
};

export default StudentDashboard;
