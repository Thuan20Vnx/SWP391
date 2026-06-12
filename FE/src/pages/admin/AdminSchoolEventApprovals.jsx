import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  approveAdminSchoolEvent,
  approveAdminModeration,
  fetchAdminModerationRequests,
  fetchAdminSchoolEvents,
  rejectAdminModeration,
  rejectAdminSchoolEvent
} from '../../services/adminApi';
import { useTranslation } from '../../i18n/I18nContext';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const AdminSchoolEventApprovals = ({ showToast }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState('submit');
  const [events, setEvents] = useState([]);
  const [modEvents, setModEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [modRejectId, setModRejectId] = useState(null);
  const [modRejectReason, setModRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const userRole = localStorage.getItem('userRole');

  const modActionLabel = (action) => {
    const key = `admin.eventApprovals.modAction.${action}`;
    const translated = t(key);
    return translated !== key ? translated : action;
  };

  const load = () => {
    setLoading(true);
    const fetcher =
      tab === 'submit'
        ? fetchAdminSchoolEvents('pending_admin').then((d) => {
            setEvents(d.events || []);
            setModEvents([]);
          })
        : fetchAdminModerationRequests().then((d) => {
            setModEvents(d.events || []);
            setEvents([]);
          });
    return fetcher.catch((e) => showToast?.(e.message, 'error')).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (userRole !== 'admin') {
      showToast?.(t('admin.common.adminOnly'), 'error');
      navigate('/profile');
      return;
    }
    load();
  }, [userRole, navigate, showToast, tab, t]);

  const handleApprove = async (id) => {
    setBusy(true);
    try {
      await approveAdminSchoolEvent(id);
      showToast?.(t('admin.eventApprovals.toast.approved'), 'success');
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleModApprove = async (eventId) => {
    setBusy(true);
    try {
      await approveAdminModeration(eventId);
      showToast?.(t('admin.eventApprovals.toast.modApproved'), 'success');
      setModEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleModReject = async () => {
    if (!modRejectId || !modRejectReason.trim()) return;
    setBusy(true);
    try {
      await rejectAdminModeration(modRejectId, modRejectReason.trim());
      showToast?.(t('admin.eventApprovals.toast.modRejected'), 'info');
      setModEvents((prev) => prev.filter((ev) => ev.id !== modRejectId));
      setModRejectId(null);
      setModRejectReason('');
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
      showToast?.(t('admin.eventApprovals.toast.rejected'), 'info');
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('admin.eventApprovals.title')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('admin.eventApprovals.subtitle')}</p>
        </header>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            className={tab === 'submit' ? 'ctsv-btn-primary' : 'ctsv-btn-secondary'}
            onClick={() => setTab('submit')}
          >
            {t('admin.eventApprovals.tab.submit')}
          </button>
          <button
            type="button"
            className={tab === 'moderation' ? 'ctsv-btn-primary' : 'ctsv-btn-secondary'}
            onClick={() => setTab('moderation')}
          >
            {t('admin.eventApprovals.tab.moderation')}
          </button>
        </div>

        {loading ? (
          <p>{t('common.loading')}</p>
        ) : tab === 'submit' && events.length === 0 ? (
          <p style={{ padding: 32, textAlign: 'center', background: '#fff', borderRadius: 12 }}>
            {t('admin.eventApprovals.empty.submit')}
          </p>
        ) : tab === 'moderation' && modEvents.length === 0 ? (
          <p style={{ padding: 32, textAlign: 'center', background: '#fff', borderRadius: 12 }}>
            {t('admin.eventApprovals.empty.moderation')}
          </p>
        ) : tab === 'submit' ? (
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
                        background: '#ffffff',
                        color: '#1d4ed8'
                      }}
                    >
                      {t('admin.eventApprovals.status.pending_admin')}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {ev.category} · {ev.location || t('admin.common.empty')} · {ev.date} {ev.time}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {t('admin.eventApprovals.submittedBy', {
                      email: ev.ctsvSubmittedByEmail || ev.createdByEmail || t('admin.common.empty'),
                    })}
                    {ev.ctsvSubmittedAt ? ` · ${formatDateTime(ev.ctsvSubmittedAt)}` : ''}
                  </p>
                  <Link to={`/ctsv/events/${ev.id}`} style={{ fontSize: '0.85rem', marginTop: 8, display: 'inline-block' }}>
                    {t('admin.common.viewDetail')}
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="ctsv-btn-primary"
                    disabled={busy}
                    onClick={() => handleApprove(ev.id)}
                  >
                    {t('admin.common.approve')}
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
                    {t('admin.common.reject')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {modEvents.map((ev) => (
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: '1.05rem' }}>{ev.title}</strong>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#ffffff', color: '#b45309' }}>
                      {modActionLabel(ev.moderationAction) || ev.status}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {t('admin.eventApprovals.ctsvReason', { reason: ev.moderationReason || t('admin.common.empty') })}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {ev.moderationRequestedByEmail || t('admin.common.empty')}
                    {ev.moderationRequestedAt ? ` · ${formatDateTime(ev.moderationRequestedAt)}` : ''}
                  </p>
                  <Link to={`/ctsv/events/${ev.id}`} style={{ fontSize: '0.85rem', marginTop: 8, display: 'inline-block' }}>
                    {t('admin.common.viewDetail')}
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button type="button" className="ctsv-btn-primary" disabled={busy} onClick={() => handleModApprove(ev.id)}>
                    {t('admin.common.approve')}
                  </button>
                  <button
                    type="button"
                    className="ctsv-btn-danger"
                    disabled={busy}
                    onClick={() => {
                      setModRejectId(ev.id);
                      setModRejectReason('');
                    }}
                  >
                    {t('admin.common.reject')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {rejectId && (
          <div className="ctsv-partner-dialog-backdrop" role="presentation" onClick={() => setRejectId(null)}>
            <div className="ctsv-partner-dialog" onClick={(e) => e.stopPropagation()}>
              <h2 className="ctsv-partner-dialog-title">{t('admin.eventApprovals.rejectSubmitTitle')}</h2>
              <label className="ctsv-partner-dialog-field">
                {t('admin.common.reason')}
                <textarea
                  className="ctsv-textarea ctsv-partner-dialog-textarea"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('admin.eventApprovals.reasonPlaceholder')}
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
                  {t('admin.eventApprovals.confirmReject')}
                </button>
              </div>
            </div>
          </div>
        )}

        {modRejectId && (
          <div className="ctsv-partner-dialog-backdrop" role="presentation" onClick={() => setModRejectId(null)}>
            <div className="ctsv-partner-dialog" onClick={(e) => e.stopPropagation()}>
              <h2 className="ctsv-partner-dialog-title">{t('admin.eventApprovals.rejectModTitle')}</h2>
              <label className="ctsv-partner-dialog-field">
                {t('admin.common.reason')}
                <textarea
                  className="ctsv-textarea ctsv-partner-dialog-textarea"
                  rows={4}
                  value={modRejectReason}
                  onChange={(e) => setModRejectReason(e.target.value)}
                  placeholder={t('admin.eventApprovals.reasonPlaceholder')}
                />
              </label>
              <div className="ctsv-partner-dialog-actions">
                <button type="button" className="ctsv-partner-dialog-cancel" onClick={() => setModRejectId(null)}>
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="ctsv-partner-dialog-submit ctsv-partner-dialog-submit--danger"
                  disabled={busy || !modRejectReason.trim()}
                  onClick={handleModReject}
                >
                  {t('admin.eventApprovals.confirmReject')}
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
