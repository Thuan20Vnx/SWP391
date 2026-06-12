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
import { API_BASE, getAuthHeaders } from '../utils/api';
import { isAdminRole, isCtsvRole, isIcpdpRole, normalizeRole } from '../utils/auth';
import '../styles/admin-dashboard.css';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const fetchPendingEvents = async () => {
  const email = localStorage.getItem('userEmail');
  const res = await fetch(`${API_BASE}/api/events/pending`, {
    headers: { ...getAuthHeaders(), 'x-user-email': email || '' },
  });
  return res.json();
};

const AdminDashboard = ({ showToast }) => {
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
          showToast(eventData.message || 'Lỗi tải danh sách sự kiện', 'error');
        }
        if (proposalData.success) {
          setProposals(proposalData.proposals || []);
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
    loadPending();
  }, [canAccess, navigate, showToast, loadPending]);

  const handleApproveEvent = async (eventId) => {
    setActingId(eventId);
    try {
      await approveCtsvEvent(eventId);
      setEvents((prev) => prev.filter((e) => String(e._id) !== String(eventId)));
      showToast('Đã phê duyệt sự kiện.', 'success');
    } catch (err) {
      showToast(err.message || 'Không thể phê duyệt sự kiện', 'error');
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
      showToast('Đã từ chối đề xuất sự kiện.', 'info');
    } catch (err) {
      showToast(err.message || 'Không thể từ chối sự kiện', 'error');
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
          ? 'Đã chuyển đề xuất sang CTSV duyệt.'
          : 'Đã phê duyệt đề xuất — sự kiện đã được tạo.',
        'success',
      );
    } catch (err) {
      showToast(err.message || 'Không thể phê duyệt đề xuất', 'error');
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
      showToast('Đã từ chối đề xuất.', 'info');
    } catch (err) {
      showToast(err.message || 'Không thể từ chối đề xuất', 'error');
      throw err;
    } finally {
      setActingId(null);
    }
  };

  const pendingTotal = events.length + proposals.length;

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
              {pendingTotal} mục chờ duyệt
            </span>
          )}
        </div>
      </header>

      {loading ? (
        <div className="admin-events-page__loading">
          <span className="btn-spinner admin-events-page__spinner" aria-hidden="true" />
          <p>Đang tải danh sách đề xuất...</p>
        </div>
      ) : pendingTotal === 0 ? (
        <div className="admin-events-empty">
          <p className="admin-events-empty__title">Không có đề xuất nào đang chờ duyệt</p>
          <p className="admin-events-empty__hint">
            Chạy <code>node seed-ctsv-demo.js</code> trong thư mục BE để có dữ liệu demo, hoặc đợi CLB gửi đề xuất mới.
          </p>
        </div>
      ) : (
        <>
          {proposals.length > 0 && (
            <section className="admin-events-section">
              <h2 className="admin-events-section__title">Đề xuất từ CLB ({proposals.length})</h2>
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
                        <span className="admin-proposal-card__badge">{proposal.status || 'Chờ duyệt'}</span>
                      </div>
                      <div className="admin-proposal-card__body">
                        <div className="admin-proposal-card__details" style={{ padding: '0 20px 16px' }}>
                          <dl className="admin-proposal-meta">
                            <div className="admin-proposal-meta__row">
                              <dt>CLB</dt>
                              <dd>{proposal.clubName || '—'}</dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>Địa điểm</dt>
                              <dd>{proposal.location || '—'}</dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>Thời gian</dt>
                              <dd>
                                {proposal.date || '—'} {proposal.time || ''}
                              </dd>
                            </div>
                            <div className="admin-proposal-meta__row">
                              <dt>Tổng vé</dt>
                              <dd>{proposal.totalTickets != null ? proposal.totalTickets : '—'}</dd>
                            </div>
                          </dl>
                          <ProposalTicketsTable
                            ticketTypes={proposal.ticketTypes}
                            ticketPrice={proposal.ticketPrice}
                          />
                          {proposal.description?.trim() ? (
                            <div className="admin-proposal-card__desc">
                              <p className="admin-proposal-card__desc-label">Mô tả</p>
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
              <h2 className="admin-events-section__title">Sự kiện chờ duyệt ({events.length})</h2>
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
                        <span className="admin-proposal-card__badge">Chờ duyệt</span>
                      </div>

                      <div className="admin-proposal-card__body">
                        <div className="admin-proposal-card__thumb-wrap">
                          <img src={event.thumbnail} alt="" className="admin-proposal-card__thumb" />
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
                                {event.ticketPrice > 0
                                  ? `${Number(event.ticketPrice).toLocaleString('vi-VN')} VNĐ`
                                  : 'Miễn phí'}
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

                          <ProposalTicketsTable
                            ticketTypes={event.ticketTypes}
                            ticketPrice={event.ticketPrice}
                          />

                          <div className="admin-proposal-card__desc">
                            <p className="admin-proposal-card__desc-label">Mô tả sự kiện</p>
                            <p className="admin-proposal-card__desc-text">
                              {event.description?.trim() || 'Không có mô tả chi tiết.'}
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
