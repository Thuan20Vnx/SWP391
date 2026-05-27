import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Events = ({ showToast }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userRole = localStorage.getItem('userRole') || 'guest';

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = () => {
    setLoading(true);
    fetch('http://localhost:5000/api/events')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEvents(data.events);
        } else {
          showToast('Lỗi tải danh sách sự kiện', 'error');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Không thể kết nối máy chủ', 'error');
        setLoading(false);
      });
  };

  return (
    <div className="profile-container" style={{ minHeight: '100vh', background: 'var(--bg-default)' }}>
      {/* Re-use Navbar from Profile style */}
      <nav className="profile-navbar" style={{ padding: '0 5%' }}>
        <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-f">F-</span>
          <span className="brand-text">Events</span>
        </div>
        <div className="navbar-actions">
          {isLoggedIn ? (
            <>
              <button className="nav-btn" onClick={() => navigate('/profile')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Hồ sơ</span>
              </button>
              {(userRole === 'student' || userRole === 'staff') && (
                <button className="primary-button" style={{ height: '36px', padding: '0 16px', fontSize: '0.85rem' }} onClick={() => navigate('/create-event')}>
                  + Đề xuất Sự Kiện
                </button>
              )}
              {userRole === 'ctsv' && (
                <button className="primary-button" style={{ height: '36px', padding: '0 16px', fontSize: '0.85rem', background: 'var(--success)' }} onClick={() => navigate('/admin/events')}>
                  Duyệt Sự Kiện
                </button>
              )}
            </>
          ) : (
            <button className="primary-button" onClick={() => navigate('/login')} style={{ height: '36px', padding: '0 16px', fontSize: '0.85rem' }}>
              Đăng nhập
            </button>
          )}
        </div>
      </nav>

      <main className="profile-main" style={{ marginTop: '80px', padding: '20px 5%' }}>
        <div className="section-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>Khám phá Sự kiện</h1>
            <p style={{ color: 'var(--text-muted)' }}>Tham gia các hoạt động sôi nổi tại FPT University</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <span className="btn-spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent', width: '30px', height: '30px', margin: 'auto' }}></span>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface-default)', borderRadius: '16px', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '3rem' }}>🎭</span>
            <h3 style={{ marginTop: '16px', color: 'var(--text-main)' }}>Chưa có sự kiện nào</h3>
            <p style={{ color: 'var(--text-muted)' }}>Các sự kiện sắp tới sẽ được cập nhật tại đây.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {events.map(event => (
              <div key={event._id} className="event-card" style={{ background: 'var(--surface-default)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-default)', transition: 'all 0.3s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ height: '180px', width: '100%', background: '#eee', position: 'relative' }}>
                  <img src={event.thumbnail} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {new Date(event.startDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.title}</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '6px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>{event.location}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>{event.capacity} người tham dự tối đa</span>
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '16px' }}>
                    {event.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Bởi: <strong style={{ color: 'var(--text-main)' }}>{event.createdBy?.fullname || 'Ẩn danh'}</strong>
                    </span>
                    <button className="primary-button" style={{ height: '32px', padding: '0 16px', fontSize: '0.85rem' }}>
                      Đăng ký
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Events;
