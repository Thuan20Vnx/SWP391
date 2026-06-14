import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  approveAdminPartner,
  fetchAdminPartners,
  rejectAdminPartner
} from '../../services/adminApi';
import { PARTNER_STATUS_LABEL, formatPartnerDate, formatVnd } from '../../utils/partnerDisplay';

const AdminPartnerApprovals = ({ showToast }) => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const userRole = localStorage.getItem('userRole');

  const load = () => {
    setLoading(true);
    return fetchAdminPartners('pending_admin')
      .then((d) => setPartners(d.partners || []))
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
      await approveAdminPartner(id);
      showToast?.('Đã phê duyệt đối tác thành công.', 'success');
      setPartners((prev) => prev.filter((p) => p._id !== id));
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
      await rejectAdminPartner(rejectId, rejectReason.trim());
      showToast?.('Đã từ chối đơn.', 'info');
      setPartners((prev) => prev.filter((p) => p._id !== rejectId));
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Phê duyệt đối tác (Admin)</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Các đơn đã được CTSV phê duyệt — Admin xác nhận lần cuối để hoàn tất.
          </p>
        </header>

        {loading ? (
          <p>Đang tải…</p>
        ) : partners.length === 0 ? (
          <p style={{ padding: 32, textAlign: 'center', background: '#fff', borderRadius: 12 }}>
            Không có đơn chờ Admin phê duyệt.
          </p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 16, listStyle: 'none', padding: 0 }}>
            {partners.map((p) => (
              <li
                key={p._id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 20
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.125rem' }}>{p.name}</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                      {p.proposedEventTitle || '—'} • {formatVnd(p.expectedSponsorAmount)}
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                      Gửi {formatPartnerDate(p.createdAt)} • CTSV: {p.ctsvApprovedByEmail || '—'} •{' '}
                      {PARTNER_STATUS_LABEL[p.status]}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ background: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                      onClick={() => navigate(`/partners/${p._id}`)}
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ background: '#16a34a', border: 'none' }}
                      disabled={busy}
                      onClick={() => handleApprove(p._id)}
                    >
                      Phê duyệt
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ background: '#dc2626', border: 'none' }}
                      disabled={busy}
                      onClick={() => {
                        setRejectId(p._id);
                        setRejectReason('');
                      }}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {rejectId && (
          <div
            className="ctsv-partner-dialog-backdrop"
            style={{ position: 'fixed', inset: 0, zIndex: 200 }}
            role="presentation"
            onClick={() => !busy && setRejectId(null)}
          >
            <div className="ctsv-partner-dialog" onClick={(e) => e.stopPropagation()}>
              <h2 className="ctsv-partner-dialog-title">Từ chối (Admin)</h2>
              <label className="ctsv-partner-dialog-field">
                <span>
                  Lý do từ chối <em>*</em>
                </span>
                <textarea
                  className="ctsv-textarea ctsv-partner-dialog-textarea"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
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
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPartnerApprovals;
