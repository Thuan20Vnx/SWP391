import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminRole, isCtsvRole, normalizeRole } from '../utils/auth';
import '../styles/admin-dashboard.css';

const AdminDashboard = ({ showToast }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userRole = normalizeRole(localStorage.getItem('userRole'));
  const canAccess = isCtsvRole(userRole) || isAdminRole(userRole);

  useEffect(() => {
    if (!canAccess) {
      showToast('Bạn không có quyền truy cập trang quản trị!', 'error');
      navigate('/profile');
      return;
    }
    fetchPendingEvents();
  }, [canAccess, navigate, showToast]);

  const fetchPendingEvents = () => {
    setLoading(true);
    const email = localStorage.getItem('userEmail');
    
    fetch('http://localhost:5000/api/events/pending', {
      headers: {
        'x-user-email': email
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEvents(data.events);
        } else {
          showToast(data.message || 'Lỗi tải danh sách', 'error');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Không thể kết nối máy chủ', 'error');
        setLoading(false);
      });
  };

  const handleStatusUpdate = (eventId, status, reason = '') => {
    const email = localStorage.getItem('userEmail');
    
    fetch(`http://localhost:5000/api/events/${eventId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': email
      },
      body: JSON.stringify({ status, rejectionReason: reason })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEvents(prev => prev.filter(e => e._id !== eventId));
        } else {
          showToast(data.message || 'Lỗi xử lý', 'error');
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Không thể kết nối máy chủ', 'error');
      });
  };

  if (!canAccess) {
    return null;
  }

  return (
      <main className="admin-main admin-events-page">
        <header className="admin-events-page__header">
          <h1 className="admin-main__title">Duyệt đề xuất sự kiện</h1>
          <p className="admin-events-page__subtitle">Các sự kiện đang chờ Phòng CTSV phê duyệt trước khi công khai.</p>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <span className="btn-spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent', width: '30px', height: '30px', margin: 'auto' }}></span>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface-default)', borderRadius: '16px', border: '1px dashed var(--border-default)' }}>
            <h3 style={{ color: 'var(--text-main)' }}>🎉 Tuyệt vời! Không có sự kiện nào đang chờ duyệt.</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {events.map(event => (
              <div key={event._id} style={{ background: 'var(--surface-default)', borderRadius: '16px', border: '1px solid var(--border-default)', padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <img src={event.thumbnail} alt={event.title} style={{ width: '200px', height: '140px', objectFit: 'cover', borderRadius: '12px' }} />
                
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>{event.title}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    <div>📍 <strong>Địa điểm:</strong> {event.location}</div>
                    <div>👥 <strong>Quy mô:</strong> {event.capacity} người</div>
                    <div>⏰ <strong>Bắt đầu:</strong> {new Date(event.startDate).toLocaleString('vi-VN')}</div>
                    <div>⏳ <strong>Kết thúc:</strong> {new Date(event.endDate).toLocaleString('vi-VN')}</div>
                    <div>👤 <strong>Người đề xuất:</strong> <span style={{ color: 'var(--primary)' }}>{event.createdBy?.fullname} ({event.createdBy?.email})</span></div>
                  </div>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', background: 'var(--bg-default)', padding: '12px', borderRadius: '8px' }}>
                    <strong>Mô tả:</strong> {event.description}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', minWidth: '150px' }}>
                  <button 
                    onClick={() => handleStatusUpdate(event._id, 'approved')}
                    className="primary-button" 
                    style={{ background: 'var(--success)', border: 'none' }}
                  >
                    ✅ Phê duyệt
                  </button>
                  <button 
                    onClick={() => {
                      const reason = window.prompt("Lý do từ chối sự kiện này:");
                      if (reason !== null) {
                        handleStatusUpdate(event._id, 'rejected', reason);
                      }
                    }}
                    className="primary-button" 
                    style={{ background: 'var(--border-error)', border: 'none' }}
                  >
                    ❌ Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
  );
};

export default AdminDashboard;
