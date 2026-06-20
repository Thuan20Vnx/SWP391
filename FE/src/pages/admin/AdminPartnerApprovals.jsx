import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  approveAdminPartner,
  fetchAdminPartners,
  rejectAdminPartner
} from '../../services/adminApi';
import { formatPartnerDate, formatVnd, getPartnerStatusLabel } from '../../utils/partnerDisplay';
import { useTranslation } from '../../i18n/I18nContext';

const AdminPartnerApprovals = ({ showToast }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      showToast?.(t('admin.common.adminOnly'), 'error');
      navigate('/profile');
      return;
    }
    load();
  }, [userRole, navigate, showToast, t]);

  const handleApprove = async (id) => {
    setBusy(true);
    try {
      const res = await approveAdminPartner(id);
      if (res.accountCreated) {
        showToast?.(t('admin.partnerApprovals.toast.approvedWithAccount'), 'success');
      } else {
        showToast?.(t('admin.partnerApprovals.toast.approved'), 'success');
      }
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
      showToast?.(t('admin.partnerApprovals.toast.rejected'), 'info');
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('admin.partnerApprovals.title')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('admin.partnerApprovals.subtitle')}</p>
        </header>

        {loading ? (
          <p>{t('common.loading')}</p>
        ) : partners.length === 0 ? (
          <p style={{ padding: 32, textAlign: 'center', background: '#fff', borderRadius: 12 }}>
            {t('admin.partnerApprovals.empty')}
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
                      {p.proposedEventTitle || t('admin.common.empty')} • {formatVnd(p.expectedSponsorAmount)}
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                      {t('admin.partnerApprovals.submitted', { date: formatPartnerDate(p.createdAt) })} •{' '}
                      {t('admin.partnerApprovals.ctsv', { email: p.ctsvApprovedByEmail || t('admin.common.empty') })} •{' '}
                      {getPartnerStatusLabel(p.status, t)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ background: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                      onClick={() => navigate(`/partners/${p._id}`)}
                    >
                      {t('admin.partnerApprovals.detail')}
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ background: '#16a34a', border: 'none' }}
                      disabled={busy}
                      onClick={() => handleApprove(p._id)}
                    >
                      {t('admin.common.approve')}
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
                      {t('admin.common.reject')}
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
              <h2 className="ctsv-partner-dialog-title">{t('admin.partnerApprovals.rejectTitle')}</h2>
              <label className="ctsv-partner-dialog-field">
                <span>
                  {t('admin.partnerApprovals.rejectReason')} <em>*</em>
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
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="ctsv-partner-dialog-submit ctsv-partner-dialog-submit--danger"
                  disabled={busy || !rejectReason.trim()}
                  onClick={handleReject}
                >
                  {t('admin.common.confirm')}
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
