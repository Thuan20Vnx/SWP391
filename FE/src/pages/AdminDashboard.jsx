import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminRole, isCtsvRole, normalizeRole } from '../utils/auth';
import '../styles/admin-dashboard.css';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const AdminDashboard = ({ showToast }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const navigate = useNavigate();
  const userRole = normalizeRole(localStorage.getItem('userRole'));
  const canAccess = isCtsvRole(userRole) || isAdminRole(userRole);

  const fetchPendingEvents = useCallback(() => {
    setLoading(true);
    const email = localStorage.getItem('userEmail');

    fetch('http://localhost:5000/api/events/pending', {
      headers: { 'x-user-email': email },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEvents(data.events || []);
        } else {
          showToast(data.message || 'Lỗi tải danh sách', 'error');
        }
        setLoading(false);
      })
      .catch(() => {
        showToast('Không thể kết nối máy chủ', 'error');
        setLoading(false);
      });
  }, [showToast]);

  useEffect(() => {
    if (!canAccess) {
      showToast('Bạn không có quyền truy cập trang quản trị!', 'error');
      navigate('/profile');
      return;
    }
    fetchPendingEvents();
  }, [canAccess, navigate, showToast, fetchPendingEvents]);

  const handleStatusUpdate = async (eventId, status, reason = '') => {
    const email = localStorage.getItem('userEmail');
    setActingId(eventId);

    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': email,
        },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });
      const data = await res.json();

      if (data.success) {
        setEvents((prev) => prev.filter((e) => e._id !== eventId));
        setRejectingId(null);
        setRejectReason('');
        showToast(
          status === 'approved' ? 'Đã phê duyệt sự kiện.' : 'Đã từ chối đề xuất sự kiện.',
          status === 'approved' ? 'success' : 'info',
        );
      } else {
        showToast(data.message || 'Lỗi xử lý', 'error');
      }
    } catch {
      showToast('Không thể kết nối máy chủ', 'error');
    } finally {
      setActingId(null);
    }
  };

  const startReject = (eventId) => {
    setRejectingId(eventId);
    setRejectReason('');
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectReason('');
  };

  if (!canAccess) return null;

  return (
    <main className="admin-main admin-events-page">
      <header className="admin-events-page__header">
        <div className="admin-events-page__title-row">
          <div>
            <h1 className="admin-main__title">Duyệt đề xuất sự kiện</h1>
            <p className="admin-events-page__subtitle">
              Các đề xuất đang chờ Phòng CTSV phê duyệt trước khi công khai trên hệ thống.
            </p>
          </div>
          {!loading && (
            <span className="admin-events-page__count" aria-live="polite">
              {events.length} đề xuất chờ duyệt
            </span>
          )}
        </div>
      </header>

      {loading ? (
        <div className="admin-events-page__loading">
          <span className="btn-spinner admin-events-page__spinner" aria-hidden="true" />
          <p>Đang tải danh sách đề xuất...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="admin-events-empty">
          <p className="admin-events-empty__title">Không có đề xuất nào đang chờ duyệt</p>
          <p className="admin-events-empty__hint">Khi CLB gửi đề xuất mới, danh sách sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <ul className="admin-proposal-list">
          {events.map((event, index) => {
            const eventId = event._id;
            const isRejecting = rejectingId === eventId;
            const isBusy = actingId === eventId;

            return (
              <li key={eventId} className="admin-proposal-card">
                <div className="admin-proposal-card__head">
                  <div className="admin-proposal-card__head-main">
                    <span className="admin-proposal-card__index">#{index + 1}</span>
                    <h2 className="admin-proposal-card__title">{event.title}</h2>
                  </div>
                  <span className="admin-proposal-card__badge">Chờ duyệt</span>
                </div>

                <div className="admin-proposal-card__body">
                  <div className="admin-proposal-card__thumb-wrap">
                    <img
                      src={event.thumbnail}
                      alt=""
                      className="admin-proposal-card__thumb"
                    />
                  </div>

                  <div className="admin-proposal-card__details">
                    <dl className="admin-proposal-meta">
                      <div className="admin-proposal-meta__row">
                        <dt>Danh mục</dt>
                        <dd>{event.category || '—'}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Địa điểm</dt>
                        <dd>{event.location || '—'}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Campus</dt>
                        <dd>{event.campus || '—'}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Quy mô</dt>
                        <dd>
                          {event.capacity != null ? `${event.capacity} người` : '—'}
                          {event.totalTickets != null ? ` · ${event.totalTickets} vé` : ''}
                        </dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Giá vé</dt>
                        <dd>
                          {event.ticketPrice > 0 ? `${Number(event.ticketPrice).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí'}
                        </dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Bắt đầu</dt>
                        <dd>{formatDateTime(event.startDate)}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Kết thúc</dt>
                        <dd>{formatDateTime(event.endDate)}</dd>
                      </div>
                      <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                        <dt>Người đề xuất</dt>
                        <dd>
                          {event.createdBy?.fullname || '—'}
                          {event.createdBy?.email ? (
                            <span className="admin-proposal-meta__email"> ({event.createdBy.email})</span>
                          ) : null}
                        </dd>
                      </div>
                      <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                        <dt>Gửi lúc</dt>
                        <dd>{formatDateTime(event.createdAt)}</dd>
                      </div>
                    </dl>

                    <div className="admin-proposal-card__desc">
                      <p className="admin-proposal-card__desc-label">Mô tả sự kiện</p>
                      <p className="admin-proposal-card__desc-text">
                        {event.description?.trim() || 'Không có mô tả chi tiết.'}
                      </p>
                    </div>
                  </div>
                </div>

                <footer className="admin-proposal-card__footer">
                  {isRejecting ? (
                    <div className="admin-proposal-reject">
                      <label className="admin-proposal-reject__label" htmlFor={`reject-${eventId}`}>
                        Lý do từ chối <span className="admin-proposal-reject__required">*</span>
                      </label>
                      <textarea
                        id={`reject-${eventId}`}
                        className="admin-proposal-reject__input"
                        rows={3}
                        placeholder="Nhập lý do để CLB biết và chỉnh sửa đề xuất..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        disabled={isBusy}
                      />
                      <div className="admin-proposal-card__actions">
                        <button
                          type="button"
                          className="admin-proposal-btn admin-proposal-btn--ghost"
                          onClick={cancelReject}
                          disabled={isBusy}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          className="admin-proposal-btn admin-proposal-btn--danger"
                          disabled={isBusy || !rejectReason.trim()}
                          onClick={() => handleStatusUpdate(eventId, 'rejected', rejectReason.trim())}
                        >
                          {isBusy ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-proposal-card__actions">
                      <button
                        type="button"
                        className="admin-proposal-btn admin-proposal-btn--approve"
                        disabled={isBusy || actingId !== null}
                        onClick={() => handleStatusUpdate(eventId, 'approved')}
                      >
                        {isBusy ? 'Đang xử lý...' : 'Phê duyệt'}
                      </button>
                      <button
                        type="button"
                        className="admin-proposal-btn admin-proposal-btn--reject"
                        disabled={isBusy || actingId !== null}
                        onClick={() => startReject(eventId)}
                      >
                        Từ chối
                      </button>
                    </div>
                  )}
                </footer>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
};

export default AdminDashboard;
