import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminProposalActions from '../components/admin/AdminProposalActions';
import ProposalTicketsTable from '../components/admin/ProposalTicketsTable';
import {
  approveCtsvEvent,
  approveCtsvProposal,
  fetchCtsvProposals,
  icpdpApproveProposal,
  rejectCtsvEvent,
  rejectCtsvProposal,
} from '../services/ctsvApi';
import { useTranslation } from '../i18n/I18nContext';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { isAdminRole, isCtsvRole, isIcpdpRole, normalizeRole } from '../utils/auth';
import '../styles/admin-dashboard.css';

const formatDateTime = (value, language) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN');
};

const fetchPendingEvents = async () => {
  const email = localStorage.getItem('userEmail');
  const res = await fetch(`${API_BASE}/api/events/pending`, {
    headers: { ...getAuthHeaders(), 'x-user-email': email || '' },
  });
  return res.json();
};

const AdminDashboard = ({ showToast }) => {
  const { t, language } = useTranslation();
  const [events, setEvents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const navigate = useNavigate();
  const userRole = normalizeRole(localStorage.getItem('userRole'));
  const canAccess = isCtsvRole(userRole) || isAdminRole(userRole);

  const loadPending = useCallback(() => {
    setLoading(true);

    Promise.all([
      fetchPendingEvents(),
      fetchCtsvProposals().catch(() => ({ success: false, proposals: [] })),
    ])
      .then(([eventData, proposalData]) => {
        if (eventData.success) {
          setEvents(eventData.events || []);
        } else {
          showToast(eventData.message || t('admin.proposals.toast.loadEventsFail'), 'error');
        }
        if (proposalData.success) {
          setProposals(proposalData.proposals || []);
        }
        setLoading(false);
      })
      .catch(() => {
        showToast(t('admin.proposals.toast.serverError'), 'error');
        setLoading(false);
      });
  }, [showToast, t]);

  useEffect(() => {
    if (!canAccess) {
      showToast(t('admin.common.noAccess'), 'error');
      navigate('/profile');
      return;
    }
    loadPending();
  }, [canAccess, navigate, showToast, loadPending, t]);

  const handleApproveEvent = async (eventId) => {
    setActingId(eventId);
    try {
      await approveCtsvEvent(eventId);
      setEvents((prev) => prev.filter((e) => String(e._id) !== String(eventId)));
      showToast(t('admin.proposals.toast.approvedEvent'), 'success');
    } catch (err) {
      showToast(err.message || t('admin.proposals.toast.approveEventFail'), 'error');
      throw err;
    } finally {
      setActingId(null);
    }
  };

  const handleRejectEvent = async (eventId, reason) => {
    setActingId(eventId);
    try {
      await rejectCtsvEvent(eventId, reason);
      setEvents((prev) => prev.filter((e) => String(e._id) !== String(eventId)));
      showToast(t('admin.proposals.toast.rejectedEvent'), 'info');
    } catch (err) {
      showToast(err.message || t('admin.proposals.toast.rejectEventFail'), 'error');
      throw err;
    } finally {
      setActingId(null);
    }
  };

  const handleApproveProposal = async (proposalId, statusKey) => {
    setActingId(proposalId);
    try {
      if (isIcpdpRole(userRole) && statusKey === 'pending_icpdp') {
        await icpdpApproveProposal(proposalId);
      } else {
        await approveCtsvProposal(proposalId);
      }
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      showToast(
        isIcpdpRole(userRole) && statusKey === 'pending_icpdp'
          ? t('admin.proposals.toast.forwardedCtsv')
          : t('admin.proposals.toast.approvedProposal'),
        'success',
      );
    } catch (err) {
      showToast(err.message || t('admin.proposals.toast.approveProposalFail'), 'error');
      throw err;
    } finally {
      setActingId(null);
    }
  };

  const handleRejectProposal = async (proposalId, reason) => {
    setActingId(proposalId);
    try {
      await rejectCtsvProposal(proposalId, reason);
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      showToast(t('admin.proposals.toast.rejectedProposal'), 'info');
    } catch (err) {
      showToast(err.message || t('admin.proposals.toast.rejectProposalFail'), 'error');
      throw err;
    } finally {
      setActingId(null);
    }
  };

  const pendingTotal = events.length + proposals.length;
  const numberLocale = language === 'en' ? 'en-US' : 'vi-VN';

  if (!canAccess) return null;

  return (
    <main className="admin-main admin-events-page">
      <header className="admin-events-page__header">
        <div className="admin-events-page__title-row">
          <div>
            <h1 className="admin-main__title">{t('admin.proposals.title')}</h1>
            <p className="admin-events-page__subtitle">{t('admin.proposals.subtitle')}</p>
          </div>
          {!loading && (
            <span className="admin-events-page__count" aria-live="polite">
              {t('admin.proposals.pendingCount', { count: pendingTotal })}
            </span>
          )}
        </div>
      </header>

      {loading ? (
        <div className="admin-events-page__loading">
          <span className="btn-spinner admin-events-page__spinner" aria-hidden="true" />
          <p>{t('admin.proposals.loading')}</p>
        </div>
      ) : pendingTotal === 0 ? (
        <div className="admin-events-empty">
          <p className="admin-events-empty__title">{t('admin.proposals.emptyTitle')}</p>
          <p className="admin-events-empty__hint">{t('admin.proposals.emptyHint')}</p>
        </div>
      ) : (
        <>
          {proposals.length > 0 && (
            <section className="admin-events-section">
              <h2 className="admin-events-section__title">
                {t('admin.proposals.sectionClubs', { count: proposals.length })}
              </h2>
              <ul className="admin-proposal-list">
                {proposals.map((proposal, index) => {
                  const proposalId = proposal.id;
                  const isBusy = actingId === proposalId;
                  return (
                    <li key={proposalId} className="admin-proposal-card">
                      <div className="admin-proposal-card__head">
                        <div className="admin-proposal-card__head-main">
                          <span className="admin-proposal-card__index">#{index + 1}</span>
                          <h2 className="admin-proposal-card__title">{proposal.title}</h2>
                        </div>
                        <span className="admin-proposal-card__badge">
                          {proposal.status || t('admin.proposals.badgePending')}
                        </span>
                      </div>
                      <div className="admin-proposal-card__body">
                        <div className="admin-proposal-card__details" style={{ padding: '0 20px 16px' }}>
                          <dl className="admin-proposal-meta">
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.club')}</dt>
                              <dd>{proposal.clubName || '—'}</dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.location')}</dt>
                              <dd>{proposal.location || '—'}</dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.time')}</dt>
                              <dd>
                                {proposal.date || '—'} {proposal.time || ''}
                              </dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.totalTickets')}</dt>
                              <dd>{proposal.totalTickets != null ? proposal.totalTickets : '—'}</dd>
                            </div>
                          </dl>
                          <ProposalTicketsTable
                            ticketTypes={proposal.ticketTypes}
                            ticketPrice={proposal.ticketPrice}
                          />
                          {proposal.description?.trim() ? (
                            <div className="admin-proposal-card__desc">
                              <p className="admin-proposal-card__desc-label">
                                {t('admin.proposals.meta.description')}
                              </p>
                              <p className="admin-proposal-card__desc-text">{proposal.description}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <footer className="admin-proposal-card__footer">
                        <AdminProposalActions
                          itemTitle={proposal.title}
                          busy={isBusy}
                          disabled={actingId !== null && !isBusy}
                          onApprove={() => handleApproveProposal(proposalId, proposal.statusKey)}
                          onReject={(reason) => handleRejectProposal(proposalId, reason)}
                        />
                      </footer>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {events.length > 0 && (
            <section className="admin-events-section">
              <h2 className="admin-events-section__title">
                {t('admin.proposals.sectionEvents', { count: events.length })}
              </h2>
              <ul className="admin-proposal-list">
                {events.map((event, index) => {
                  const eventId = event._id;
                  const isBusy = actingId === eventId;

                  return (
                    <li key={eventId} className="admin-proposal-card">
                      <div className="admin-proposal-card__head">
                        <div className="admin-proposal-card__head-main">
                          <span className="admin-proposal-card__index">#{index + 1}</span>
                          <h2 className="admin-proposal-card__title">{event.title}</h2>
                        </div>
                        <span className="admin-proposal-card__badge">
                          {t('admin.proposals.badgePending')}
                        </span>
                      </div>

                      <div className="admin-proposal-card__body">
                        <div className="admin-proposal-card__thumb-wrap">
                          <img src={event.thumbnail} alt="" className="admin-proposal-card__thumb" />
                        </div>

                        <div className="admin-proposal-card__details">
                          <dl className="admin-proposal-meta">
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.category')}</dt>
                              <dd>{event.category || '—'}</dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.location')}</dt>
                              <dd>{event.location || '—'}</dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.campus')}</dt>
                              <dd>{event.campus || '—'}</dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.scale')}</dt>
                              <dd>
                                {event.capacity != null
                                  ? t('admin.proposals.capacityPeople', { count: event.capacity })
                                  : '—'}
                                {event.totalTickets != null
                                  ? ` · ${t('admin.proposals.ticketsCount', { count: event.totalTickets })}`
                                  : ''}
                              </dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.ticketPrice')}</dt>
                              <dd>
                                {event.ticketPrice > 0
                                  ? `${Number(event.ticketPrice).toLocaleString(numberLocale)} VND`
                                  : t('admin.proposals.freeTicket')}
                              </dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.start')}</dt>
                              <dd>{formatDateTime(event.startDate, language)}</dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>{t('admin.proposals.meta.end')}</dt>
                              <dd>{formatDateTime(event.endDate, language)}</dd>
                            </div>
                            <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                              <dt>{t('admin.proposals.meta.proposer')}</dt>
                              <dd>
                                {event.createdBy?.fullname || '—'}
                                {event.createdBy?.email ? (
                                  <span className="admin-proposal-meta__email"> ({event.createdBy.email})</span>
                                ) : null}
                              </dd>
                            </div>
                            <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                              <dt>{t('admin.proposals.meta.submittedAt')}</dt>
                              <dd>{formatDateTime(event.createdAt, language)}</dd>
                            </div>
                          </dl>

                          <ProposalTicketsTable
                            ticketTypes={event.ticketTypes}
                            ticketPrice={event.ticketPrice}
                          />

                          <div className="admin-proposal-card__desc">
                            <p className="admin-proposal-card__desc-label">
                              {t('admin.proposals.eventDescription')}
                            </p>
                            <p className="admin-proposal-card__desc-text">
                              {event.description?.trim() || t('admin.proposals.noDescription')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <footer className="admin-proposal-card__footer">
                        <AdminProposalActions
                          itemTitle={event.title}
                          busy={isBusy}
                          disabled={actingId !== null && !isBusy}
                          onApprove={() => handleApproveEvent(eventId)}
                          onReject={(reason) => handleRejectEvent(eventId, reason)}
                        />
                      </footer>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
};

export default AdminDashboard;
