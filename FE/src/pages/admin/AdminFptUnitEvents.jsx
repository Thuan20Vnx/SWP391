import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import AdminProposalActions from '../../components/admin/AdminProposalActions';
import AdminClubProposalCard from '../../components/admin/AdminClubProposalCard';
import { fetchAdminUnitEvents } from '../../services/adminApi';
import {
  approveCtsvEvent,
  approveCtsvProposal,
  rejectCtsvEvent,
  rejectCtsvProposal,
} from '../../services/ctsvApi';
import { approveAdminSchoolEvent, rejectAdminSchoolEvent } from '../../services/adminApi';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';
import { FPT_TYPE_META } from '../../data/adminFptSystemData';
import { useTranslation } from '../../i18n/I18nContext';
import { resolveLabel } from '../../i18n/helpers';
import { statusClass } from '../../utils/eventStatus';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-public-pages.css';
import '../../styles/premium-ui.css';

const SOURCE_META = {
  school: { labelKey: 'admin.unitEvents.source.school', tone: 'school' },
  partner: { labelKey: 'admin.unitEvents.source.partner', tone: 'partner' },
  club: { labelKey: 'admin.unitEvents.source.club', tone: 'club' },
};

const PENDING_KEYS = ['pending', 'pending_ctsv', 'pending_icpdp', 'pending_admin', 'revision'];

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const getSourceMeta = (source) => SOURCE_META[source] || SOURCE_META.club;

const EventCardSkeleton = () => (
  <article className="ctsv-events-card ctsv-events-card--skeleton" aria-hidden>
    <div className="ctsv-events-card-media sk" />
    <div className="ctsv-events-card-body">
      <div className="sk sk-line sk-line--lg" />
      <div className="sk sk-line" />
      <div className="sk sk-line sk-line--short" />
    </div>
  </article>
);

const AdminFptUnitEvents = () => {
  const { unitType, unitId } = useParams();
  const [searchParams] = useSearchParams();
  const unitName = searchParams.get('name') || '';
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const { t } = useTranslation();

  const [scope, setScope] = useState('unit');
  const [events, setEvents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetchAdminUnitEvents({ unitType, unitId, scope });
      setEvents(res.events || []);
      setProposals(res.proposals || []);
    } catch (e) {
      const msg = e.message || t('admin.unitEvents.toast.loadFail');
      setLoadError(msg);
      showToast?.(msg, 'error');
      setEvents([]);
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [unitType, unitId, scope, showToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const pageTitle = unitName || unitId || t('admin.unitEvents.fallbackUnit');
  const badgeKind = unitType === 'clb' ? 'clb' : 'partner';
  const badgeMeta = FPT_TYPE_META[badgeKind] || FPT_TYPE_META.partner;

  const scopeHint = useMemo(() => {
    if (scope === 'all') return t('admin.unitEvents.scopeHint.all');
    return t('admin.unitEvents.scopeHint.unit', { unit: pageTitle });
  }, [scope, pageTitle, t]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter((ev) => {
      const hay = [ev.title, ev.location, ev.category, ev.source, ev.status].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [events, searchQuery]);

  const pendingCount = useMemo(
    () =>
      events.filter((ev) => PENDING_KEYS.includes(ev.statusKey || '')).length + proposals.length,
    [events, proposals],
  );

  const isPendingEvent = (event) => PENDING_KEYS.includes(event.statusKey || event.status);

  const handleApproveEvent = async (eventId, source) => {
    setActingId(eventId);
    try {
      if (source === 'school') {
        await approveAdminSchoolEvent(eventId);
      } else {
        await approveCtsvEvent(eventId);
      }
      setEvents((prev) => prev.filter((e) => String(e.id || e._id) !== String(eventId)));
      showToast?.(t('admin.unitEvents.toast.approved'), 'success');
    } catch (err) {
      showToast?.(err.message || t('admin.unitEvents.toast.approveFail'), 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleRejectEvent = async (eventId, reason, source) => {
    setActingId(eventId);
    try {
      if (source === 'school') {
        await rejectAdminSchoolEvent(eventId, reason);
      } else {
        await rejectCtsvEvent(eventId, reason);
      }
      setEvents((prev) => prev.filter((e) => String(e.id || e._id) !== String(eventId)));
      showToast?.(t('admin.unitEvents.toast.rejected'), 'info');
    } catch (err) {
      showToast?.(err.message || t('admin.unitEvents.toast.rejectFail'), 'error');
      throw err;
    } finally {
      setActingId(null);
    }
  };

  const handleApproveProposal = async (proposalId) => {
    setActingId(proposalId);
    try {
      await approveCtsvProposal(proposalId);
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      showToast?.(t('admin.unitEvents.toast.proposalApproved'), 'success');
      await load();
    } catch (err) {
      showToast?.(err.message || t('admin.unitEvents.toast.proposalApproveFail'), 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleRejectProposal = async (proposalId, reason) => {
    setActingId(proposalId);
    try {
      await rejectCtsvProposal(proposalId, reason);
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      showToast?.(t('admin.unitEvents.toast.proposalRejected'), 'info');
    } catch (err) {
      showToast?.(err.message || t('admin.unitEvents.toast.proposalRejectFail'), 'error');
      throw err;
    } finally {
      setActingId(null);
    }
  };

  const partnerDetailId = String(unitId || '').replace(/^partner-/, '');

  return (
    <main className="admin-main admin-fpt-unit-events ctsv-announce-page">
      <Link to="/" className="admin-fpt-unit-events__back">
        {t('admin.unitEvents.back')}
      </Link>

      <header className="admin-fpt-unit-events__hero">
        <div className="admin-fpt-unit-events__hero-text">
          <span className={`admin-fpt-unit-events__badge admin-fpt-unit-events__badge--${badgeKind}`}>
            {resolveLabel(badgeMeta, t)}
          </span>
          <h1>{t('admin.unitEvents.title')}</h1>
          <p className="admin-fpt-unit-events__unit-name">{pageTitle}</p>
          <p className="admin-fpt-unit-events__hint">{scopeHint}</p>
        </div>
        <div className="admin-fpt-unit-events__hero-aside">
          <div className="admin-fpt-unit-events__stat" aria-live="polite">
            <strong>{loading ? t('admin.common.empty') : filteredEvents.length + proposals.length}</strong>
            <span>{t('admin.unitEvents.itemsShown')}</span>
          </div>
          {unitType === 'partner' && (
            <button
              type="button"
              className="admin-fpt-unit-events__aside-btn"
              onClick={() => navigate(`/partners/${partnerDetailId}`)}
            >
              {t('admin.unitEvents.partnerDetail')}
            </button>
          )}
        </div>
      </header>

      <section className="admin-fpt-unit-events__toolbar">
        <div className="admin-fpt-unit-events__scope" role="tablist" aria-label={t('admin.unitEvents.scopeAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'unit'}
            className={`admin-fpt-unit-events__scope-btn${scope === 'unit' ? ' is-active' : ''}`}
            onClick={() => setScope('unit')}
          >
            {t('admin.unitEvents.scope.unit')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'all'}
            className={`admin-fpt-unit-events__scope-btn${scope === 'all' ? ' is-active' : ''}`}
            onClick={() => setScope('all')}
          >
            {t('admin.unitEvents.scope.all')}
          </button>
        </div>

        <label className="admin-fpt-unit-events__search">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              fill="currentColor"
            />
          </svg>
          <input
            type="search"
            placeholder={t('admin.unitEvents.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
      </section>

      {!loading && !loadError && pendingCount > 0 && scope === 'unit' && (
        <p className="admin-fpt-unit-events__pending-note">
          {t('admin.unitEvents.pendingNote', { count: pendingCount })}
        </p>
      )}

      {loading ? (
        <div className="ctsv-events-grid admin-fpt-unit-events__grid" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : loadError ? (
        <div className="admin-fpt-unit-events__error">
          <p>{loadError}</p>
          <button type="button" className="admin-fpt-unit-events__retry" onClick={load}>
            {t('admin.unitEvents.retry')}
          </button>
        </div>
      ) : (
        <>
          {scope === 'unit' && proposals.length > 0 && (
            <section className="admin-fpt-unit-events__proposals">
              <h2>{t('admin.unitEvents.proposalsTitle', { count: proposals.length })}</h2>
              <ul className="admin-proposal-list admin-fpt-unit-events__proposal-list">
                {proposals.map((proposal, index) => {
                  const proposalId = proposal.id;
                  const isBusy = actingId === proposalId;
                  return (
                    <AdminClubProposalCard
                      key={proposalId}
                      proposal={proposal}
                      index={index}
                      busy={isBusy}
                      actionsDisabled={actingId !== null && !isBusy}
                      hideApprove={proposal.statusKey === 'pending_icpdp'}
                      onApprove={() => handleApproveProposal(proposalId)}
                      onReject={(reason) => handleRejectProposal(proposalId, reason)}
                    />
                  );
                })}
              </ul>
            </section>
          )}

          {filteredEvents.length === 0 && proposals.length === 0 ? (
            <div className="admin-fpt-unit-events__empty">
              <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 2v4M8 2v4M3 10h18" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <h2>
                {searchQuery
                  ? t('admin.unitEvents.empty.searchTitle')
                  : scope === 'unit'
                    ? t('admin.unitEvents.empty.unitTitle')
                    : t('admin.unitEvents.empty.allTitle')}
              </h2>
              <p>
                {searchQuery
                  ? t('admin.unitEvents.empty.searchDesc')
                  : scope === 'unit'
                    ? t('admin.unitEvents.empty.unitDesc')
                    : t('admin.unitEvents.empty.allDesc')}
              </p>
              {scope === 'unit' && !searchQuery && (
                <button type="button" className="admin-fpt-unit-events__retry" onClick={() => setScope('all')}>
                  {t('admin.unitEvents.viewAll')}
                </button>
              )}
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="ctsv-events-grid admin-fpt-unit-events__grid">
              {filteredEvents.map((ev) => {
                const eventId = ev.id || ev._id;
                const source = getSourceMeta(ev.source);
                const pending = isPendingEvent(ev);
                const isBusy = actingId === eventId;
                return (
                  <article key={eventId} className="ctsv-events-card admin-fpt-unit-events__card">
                    <div className="ctsv-events-card-media">
                      <img
                        src={ev.image || ev.thumbnail}
                        alt=""
                        className="ctsv-events-card-img"
                        loading="lazy"
                      />
                      <span className="ctsv-events-card-category">
                        {getCategoryDisplayLabel(ev.category) || ev.category}
                      </span>
                      <span className={`ctsv-events-card-source ctsv-events-card-source--${source.tone}`}>
                        {resolveLabel(source, t)}
                      </span>
                    </div>
                    <div className="ctsv-events-card-body">
                      <h3 className="ctsv-events-card-title">{ev.title}</h3>
                      <ul className="ctsv-events-card-meta">
                        <li>
                          <span>{ev.date || formatDateTime(ev.startDate)}</span>
                        </li>
                        <li>
                          <span>{ev.location || t('admin.unitEvents.noLocation')}</span>
                        </li>
                      </ul>
                      <div className="ctsv-events-card-stats">
                        <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>
                          {ev.status}
                        </span>
                      </div>
                      <div className="admin-fpt-unit-events__card-actions">
                        <Link to={`/events/${eventId}`} className="ctsv-events-card-action btn-card-register">
                          {t('admin.common.viewDetail')}
                        </Link>
                        {pending && scope === 'unit' && (
                          <div className="admin-fpt-unit-events__card-moderate">
                            <AdminProposalActions
                              itemTitle={ev.title}
                              busy={isBusy}
                              disabled={actingId !== null && !isBusy}
                              onApprove={() => handleApproveEvent(eventId, ev.source)}
                              onReject={(reason) => handleRejectEvent(eventId, reason, ev.source)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </main>
  );
};

export default AdminFptUnitEvents;
