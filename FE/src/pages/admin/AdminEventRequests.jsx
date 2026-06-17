import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  EVENT_REQUEST_FILTERS,
  EVENT_REQUEST_TYPE_META,
} from '../../data/adminEventRequestsData';
import {
  approveAdminEventRequest,
  fetchAdminEventRequests,
  rejectAdminEventRequest,
} from '../../services/adminApi';
import { isAdminRole, isCtsvRole } from '../../utils/auth';
import { useTranslation } from '../../i18n/I18nContext';
import { resolveLabel } from '../../i18n/helpers';
import AdminFilterDropdown from '../../components/admin/AdminFilterDropdown';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-event-requests.css';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const DIFF_FIELDS = [
  { key: 'title', labelKey: 'admin.eventRequests.field.title' },
  { key: 'location', labelKey: 'admin.eventRequests.field.location' },
  { key: 'description', labelKey: 'admin.eventRequests.field.description' },
  { key: 'category', labelKey: 'admin.eventRequests.field.category' },
  { key: 'capacity', labelKey: 'admin.eventRequests.field.capacity' },
  { key: 'startDate', labelKey: 'admin.eventRequests.field.startDate', fmt: formatDateTime },
  { key: 'endDate', labelKey: 'admin.eventRequests.field.endDate', fmt: formatDateTime },
];

const DiffBlock = ({ request, t }) => {
  if (request.requestType !== 'edit') {
    return (
      <p className="admin-event-request-reason">
        <strong>{t('admin.eventRequests.action')}</strong>
        {request.requestType === 'hide'
          ? t('admin.eventRequests.action.hide')
          : t('admin.eventRequests.action.delete')}
      </p>
    );
  }

  const before = request.snapshot || {};
  const after = request.payload || {};

  const renderVal = (key, obj, fmt) => {
    const v = obj[key];
    if (fmt) return fmt(v);
    if (key === 'description' && v) return v.length > 120 ? `${v.slice(0, 120)}…` : v;
    return v != null && v !== '' ? String(v) : t('admin.common.empty');
  };

  return (
    <div className="admin-event-request-diff">
      <div className="admin-event-request-diff__col">
        <h4>{t('admin.eventRequests.diff.current')}</h4>
        <ul>
          {DIFF_FIELDS.map((f) => (
            <li key={f.key}>
              <strong>{t(f.labelKey)}:</strong> {renderVal(f.key, before, f.fmt)}
            </li>
          ))}
        </ul>
      </div>
      <div className="admin-event-request-diff__col admin-event-request-diff__col--new">
        <h4>{t('admin.eventRequests.diff.proposed')}</h4>
        <ul>
          {DIFF_FIELDS.map((f) => (
            <li key={f.key}>
              <strong>{t(f.labelKey)}:</strong> {renderVal(f.key, after, f.fmt)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const RequestCard = ({ request, actingId, notes, onNoteChange, onApprove, onReject, t }) => {
  const meta = EVENT_REQUEST_TYPE_META[request.requestType] || {
    label: request.requestTypeLabel,
    tone: 'edit',
  };
  const isPending = request.status === 'pending';
  const busy = actingId === request.id;

  return (
    <article className="admin-event-request-card">
      <header className="admin-event-request-card__head">
        <div>
          <h2 className="admin-event-request-card__title">
            {request.event?.title || t('admin.eventRequests.unknownEvent')}
          </h2>
          <p className="admin-event-request-card__sub">
            {request.clubName || `${t('admin.common.club')} —`} ·{' '}
            {request.requestedByName || request.requestedByEmail || t('admin.common.empty')} ·{' '}
            {t('admin.eventRequests.submitted', {
              time: request.createdAtLabel || formatDateTime(request.createdAt),
            })}
          </p>
        </div>
        <div className="admin-event-request-badges">
          <span className={`admin-event-request-badge admin-event-request-badge--${meta.tone}`}>
            {resolveLabel(meta, t) || meta.label}
          </span>
          <span
            className={`admin-event-request-badge ${
              request.status === 'pending'
                ? 'admin-event-request-badge--pending'
                : request.status === 'approved'
                  ? 'admin-event-request-badge--done'
                  : 'admin-event-request-badge--rejected'
            }`}
          >
            {request.statusLabel}
          </span>
        </div>
      </header>

      <div className="admin-event-request-card__body">
        <p className="admin-event-request-reason">
          <strong>{t('admin.eventRequests.clubReason')}</strong>
          {request.reason || t('admin.common.empty')}
        </p>
        <DiffBlock request={request} t={t} />
        {request.adminNote && !isPending ? (
          <p className="admin-event-request-reason">
            <strong>{t('admin.eventRequests.adminNote')}</strong>
            {request.adminNote}
          </p>
        ) : null}
      </div>

      {isPending && (
        <footer className="admin-event-request-card__footer">
          <textarea
            className="admin-event-request-note"
            rows={2}
            placeholder={t('admin.eventRequests.notePlaceholder')}
            value={notes[request.id] || ''}
            onChange={(e) => onNoteChange(request.id, e.target.value)}
            disabled={busy}
          />
          <div className="admin-event-request-card__actions">
            <button
              type="button"
              className="admin-proposal-btn admin-proposal-btn--approve"
              disabled={busy || !!actingId}
              onClick={() => onApprove(request.id)}
            >
              {busy ? t('admin.common.processing') : t('admin.eventRequests.accept')}
            </button>
            <button
              type="button"
              className="admin-proposal-btn admin-proposal-btn--reject"
              disabled={busy || !!actingId}
              onClick={() => onReject(request.id)}
            >
              {t('admin.common.reject')}
            </button>
          </div>
        </footer>
      )}
    </article>
  );
};

const AdminEventRequests = ({ showToast: showToastProp }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const showToast = showToastProp || outlet.showToast;
  const { t } = useTranslation();
  const role = localStorage.getItem('userRole');
  const canAccess = isAdminRole(role) || isCtsvRole(role);

  const [activeFilter, setActiveFilter] = useState('pending');
  const activeFilterDef =
    EVENT_REQUEST_FILTERS.find((f) => f.id === activeFilter) || EVENT_REQUEST_FILTERS[0];
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [notes, setNotes] = useState({});
  const [openMenu, setOpenMenu] = useState(null);

  const filterOptions = useMemo(
    () =>
      EVENT_REQUEST_FILTERS.map((f) => ({
        value: f.id,
        label: resolveLabel(f, t),
      })),
    [t],
  );

  useEffect(() => {
    if (!canAccess) {
      showToast?.(t('admin.common.pageAccessDenied'), 'error');
      navigate('/profile');
    }
  }, [canAccess, navigate, showToast, t]);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const data = await fetchAdminEventRequests({
        status: activeFilterDef.status,
        type: activeFilterDef.type,
      });
      setRequests(data.requests || []);
    } catch (err) {
      showToast?.(err.message || t('admin.eventRequests.toast.loadFail'), 'error');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [canAccess, activeFilter, showToast, activeFilterDef.status, activeFilterDef.type, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await approveAdminEventRequest(id, notes[id]?.trim() || '');
      showToast?.(t('admin.eventRequests.toast.approved'), 'success');
      setNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      showToast?.(err.message || t('admin.eventRequests.toast.approveFail'), 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    const note = notes[id]?.trim();
    if (!note) {
      showToast?.(t('admin.eventRequests.toast.rejectReasonRequired'), 'error');
      return;
    }
    setActingId(id);
    try {
      await rejectAdminEventRequest(id, note);
      showToast?.(t('admin.eventRequests.toast.rejected'), 'info');
      setNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      showToast?.(err.message || t('admin.eventRequests.toast.rejectFail'), 'error');
    } finally {
      setActingId(null);
    }
  };

  if (!canAccess) return null;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <main className="admin-event-requests">
      <header className="admin-event-requests__header">
        <h1>{t('admin.eventRequests.title')}</h1>
        <p>{t('admin.eventRequests.subtitle')}</p>
      </header>

      <div className="admin-event-requests__filters">
        <div className="admin-event-requests__filter-group" aria-label={t('admin.eventRequests.filterAria')}>
          <AdminFilterDropdown
            label=""
            value={activeFilter}
            options={filterOptions}
            onChange={setActiveFilter}
            menuOpen={openMenu === 'filter'}
            onMenuToggle={setOpenMenu}
            menuId="filter"
          />
        </div>
        <span className="admin-event-requests__count">
          {loading
            ? t('admin.eventRequests.count.loading')
            : t('admin.eventRequests.count', {
                count: requests.length,
                pendingSuffix:
                  activeFilterDef.status === 'pending'
                    ? t('admin.eventRequests.count.pendingSuffix', { pending: pendingCount })
                    : '',
              })}
        </span>
      </div>

      {loading ? (
        <p className="admin-events-empty">{t('admin.eventRequests.loadingList')}</p>
      ) : requests.length === 0 ? (
        <div className="admin-event-requests__empty">
          <p>{t('admin.eventRequests.empty')}</p>
          <p>{t('admin.eventRequests.emptyHint')}</p>
        </div>
      ) : (
        requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            actingId={actingId}
            notes={notes}
            onNoteChange={handleNoteChange}
            onApprove={handleApprove}
            onReject={handleReject}
            t={t}
          />
        ))
      )}
    </main>
  );
};

export default AdminEventRequests;
