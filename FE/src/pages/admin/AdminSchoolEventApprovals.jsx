import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  approveAdminSchoolEvent,
  fetchAdminSchoolEvents,
  rejectAdminSchoolEvent
} from '../../services/adminApi';
import { SCHOOL_EVENT_STATUS_LABELS } from '../../constants/eventWorkflow';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const AdminSchoolEventApprovals = ({ showToast }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const userRole = localStorage.getItem('userRole');

  const load = () => {
    setLoading(true);
    return fetchAdminSchoolEvents('pending_admin')
      .then((d) => setEvents(d.events || []))
      .catch((e) => showToast?.(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (userRole !== 'admin') {
      showToast?.('Chỉ tài khoản Admin mới truy cập được trang này.', 'error');
      navigate('/profile');
      return;
    }
    load();
  }, [userRole, navigate, showToast]);

  const handleApprove = async (id) => {
    setBusy(true);
    try {
      await approveAdminSchoolEvent(id);
      showToast?.('Đã phê duyệt sự kiện cấp trường.', 'success');
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setBusy(true);
    try {
      await rejectAdminSchoolEvent(rejectId, rejectReason.trim());
      showToast?.('Đã từ chối đơn tổ chức sự kiện.', 'info');
      setEvents((prev) => prev.filter((ev) => ev.id !== rejectId));
      setRejectId(null);
      setRejectReason('');
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-container" style={{ minHeight: '100vh', background: 'var(--bg-default)' }}>
      <main className="profile-main" style={{ marginTop: '40px', padding: '24px 5%', maxWidth: 960, margin: '40px auto' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Phê duyệt sự kiện cấp trường (Admin)</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            CTSV đã gửi đơn tổ chức — Admin xác nhận trước khi CTSV được publish và mở đăng ký.
          </p>
        </header>

        {loading ? (
          <p>Đang tải…</p>
        ) : events.length === 0 ? (
          <p style={{ padding: 32, textAlign: 'center', background: '#fff', borderRadius: 12 }}>
            Không có đơn tổ chức sự kiện chờ Admin phê duyệt.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {events.map((ev) => (
              <li
                key={ev.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #ebe3dd',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start'
                }}
              >
                {ev.image ? (
                  <img
                    src={ev.image}
                    alt=""
                    style={{ width: 96, height: 54, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  />
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: '1.05rem' }}>{ev.title}</strong>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: '#eff6ff',
                        color: '#1d4ed8'
                      }}
                    >
                      {SCHOOL_EVENT_STATUS_LABELS.pending_admin}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {ev.category} · {ev.location || '—'} · {ev.date} {ev.time}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Gửi bởi CTSV: {ev.ctsvSubmittedByEmail || ev.createdByEmail || '—'}
                    {ev.ctsvSubmittedAt ? ` · ${formatDateTime(ev.ctsvSubmittedAt)}` : ''}
                  </p>
                  <Link to={`/ctsv/events/${ev.id}`} style={{ fontSize: '0.85rem', marginTop: 8, display: 'inline-block' }}>
                    Xem chi tiết
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="ctsv-btn-primary"
                    disabled={busy}
                    onClick={() => handleApprove(ev.id)}
                  >
                    Phê duyệt
                  </button>
                  <button
                    type="button"
                    className="ctsv-btn-danger"
                    disabled={busy}
                    onClick={() => {
                      setRejectId(ev.id);
                      setRejectReason('');
                    }}
                  >
                    Từ chối
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {rejectId && (
          <div className="ctsv-partner-dialog-backdrop" role="presentation" onClick={() => setRejectId(null)}>
            <div className="ctsv-partner-dialog" onClick={(e) => e.stopPropagation()}>
              <h2 className="ctsv-partner-dialog-title">Từ chối đơn tổ chức (Admin)</h2>
              <label className="ctsv-partner-dialog-field">
                Lý do
                <textarea
                  className="ctsv-textarea ctsv-partner-dialog-textarea"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                />
              </label>
              <div className="ctsv-partner-dialog-actions">
                <button type="button" className="ctsv-partner-dialog-cancel" onClick={() => setRejectId(null)}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="ctsv-partner-dialog-submit ctsv-partner-dialog-submit--danger"
                  disabled={busy || !rejectReason.trim()}
                  onClick={handleReject}
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminSchoolEventApprovals;
