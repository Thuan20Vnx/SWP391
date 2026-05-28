import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { myEvents } from '../data/studentMockData';

const tabs = [
  { key: 'upcoming', label: 'Sắp diễn ra' },
  { key: 'attended', label: 'Đã tham gia' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const MyEvents = ({ showToast }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const events = myEvents[activeTab] || [];

  return (
    <StudentDashboardLayout
      activeMenu="my-events"
      pageTitle="Sự kiện của tôi"
      pageSubtitle="Theo dõi và quản lý các hoạt động bạn đã đăng ký tham gia."
      showToast={showToast}
    >
      <div className="student-page-actions">
        <button type="button" className="primary-button student-pill-btn" onClick={() => navigate('/events')}>
          Khám phá sự kiện
        </button>
      </div>

      <div className="student-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`student-tab ${activeTab === tab.key ? 'student-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="student-event-list">
        {events.length === 0 ? (
          <div className="student-empty-state">
            <span>📭</span>
            <h3>Chưa có sự kiện nào</h3>
            <p>Hãy khám phá và đăng ký các sự kiện thú vị tại campus.</p>
          </div>
        ) : (
          events.map((event) => (
            <article key={event.id} className="student-event-card">
              <img src={event.image} alt="" />
              <div className="student-event-card__body">
                <span className="student-badge student-badge--primary">{event.status}</span>
                <h3>{event.title}</h3>
                <p>{event.date}</p>
                <p>{event.location}</p>
                <div className="student-event-card__actions">
                  <button type="button" className="student-outline-btn">Xem vé QR</button>
                  <button type="button" className="student-link-btn">Chi tiết</button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </StudentDashboardLayout>
  );
};

export default MyEvents;
