import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { API_BASE, getAuthHeaders } from '../utils/api';

const tabs = [
  { key: 'upcoming', label: 'Sắp diễn ra' },
  { key: 'attended', label: 'Đã tham gia' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const MyEvents = ({ showToast }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/user/my-events?tab=${activeTab}`, {
      headers: getAuthHeaders(false),
    })
      .then((res) => {
        if (res.status === 401) {
          navigate('/login');
          return Promise.reject(new Error('Unauthorized'));
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setEvents(data.events || []);
        } else {
          setEvents([]);
        }
      })
      .catch((err) => {
        if (err.message !== 'Unauthorized') {
          showToast?.('Không thể tải sự kiện đã đăng ký.', 'error');
        }
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, navigate, showToast]);

  const handleCancel = async (event) => {
    if (activeTab !== 'upcoming') return;

    try {
      const res = await fetch(`${API_BASE}/api/events/${event.eventId}/register`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast?.(data.message || 'Không thể hủy đăng ký.', 'error');
        return;
      }

      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      showToast?.(data.message || 'Đã hủy đăng ký sự kiện.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Không thể kết nối máy chủ.', 'error');
    }
  };

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
        {loading ? (
          <div className="student-empty-state">
            <p>Đang tải...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="student-empty-state">
            <span className="student-empty-state__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </span>
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
                  {activeTab === 'upcoming' && (
                    <button
                      type="button"
                      className="student-link-btn"
                      onClick={() => handleCancel(event)}
                    >
                      Hủy đăng ký
                    </button>
                  )}
                  <button
                    type="button"
                    className="student-link-btn"
                    onClick={() => navigate('/events')}
                  >
                    Chi tiết
                  </button>
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
