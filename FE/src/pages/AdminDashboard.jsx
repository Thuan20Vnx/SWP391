import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminProposalActions from '../components/admin/AdminProposalActions';
import ProposalTicketsTable from '../components/admin/ProposalTicketsTable';
import {
  approveCtsvEvent,
  approveCtsvProposal,
  fetchCtsvEvents,
  fetchCtsvProposals,
  icpdpApproveProposal,
  rejectCtsvEvent,
  rejectCtsvProposal,
} from '../services/ctsvApi';
import { approveAdminSchoolEvent, rejectAdminSchoolEvent } from '../services/adminApi';
import { isAdminRole, isCtsvRole, isIcpdpRole, normalizeRole } from '../utils/auth';
import { useCloseOnClickOutside } from '../hooks/useCloseOnClickOutside';
import '../styles/admin-dashboard.css';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
};

// --- Phân loại nguồn (trái) ---
const SOURCE_FILTERS = [
  { id: 'all',   label: 'Tất cả' },
  { id: 'ctsv',  label: 'CTSV' },     // sự kiện cấp trường + đối tác
  { id: 'icpdp', label: 'IC-PDP' },   // sự kiện / đề xuất CLB
];

const SOURCE_META = {
  school:  { label: 'Cấp trường', tone: 'orange' },
  partner: { label: 'Đối tác',    tone: 'teal'   },
  club:    { label: 'CLB',        tone: 'indigo' },
};

const matchSource = (item, sourceFilter) => {
  if (sourceFilter === 'all') return true;
  if (sourceFilter === 'ctsv') return item.source === 'school' || item.source === 'partner';
  if (sourceFilter === 'icpdp') return item.source === 'club';
  return true;
};

// --- Nhóm trạng thái (phải) ---
const PENDING_KEYS = ['pending', 'pending_icpdp', 'pending_ctsv', 'pending_admin'];
const ACCEPT_KEYS = ['approved', 'live', 'ended'];
const REJECT_KEYS = ['rejected'];
const EDIT_KEYS = ['revision', 'pending_edit'];
const CANCEL_KEYS = ['pending_cancel', 'pending_icpdp_cancel', 'pending_postpone', 'pending_icpdp_postpone', 'pending_hide'];

const STATUS_META = {
  pending:               { label: 'Chờ duyệt',        tone: 'amber'  },
  pending_icpdp:         { label: 'Chờ IC-PDP',       tone: 'amber'  },
  pending_ctsv:          { label: 'Chờ CTSV',         tone: 'amber'  },
  pending_admin:         { label: 'Chờ Admin',        tone: 'blue'   },
  approved:              { label: 'Mở đăng ký',       tone: 'green'  },
  live:                  { label: 'Đang diễn ra',     tone: 'green'  },
  ended:                 { label: 'Đã kết thúc',      tone: 'slate'  },
  rejected:              { label: 'Từ chối',          tone: 'red'    },
  revision:              { label: 'Cần chỉnh sửa',    tone: 'orange' },
  pending_edit:          { label: 'Chờ duyệt sửa',    tone: 'orange' },
  pending_cancel:        { label: 'Yêu cầu hủy',      tone: 'red'    },
  pending_icpdp_cancel:  { label: 'Yêu cầu hủy (ICPDP)', tone: 'red' },
  pending_postpone:      { label: 'Yêu cầu hoãn',     tone: 'orange' },
  pending_icpdp_postpone:{ label: 'Yêu cầu hoãn (ICPDP)', tone: 'orange' },
  pending_hide:          { label: 'Yêu cầu ẩn',       tone: 'slate'  },
  draft:                 { label: 'Bản nháp',         tone: 'slate'  },
};

const matchStatus = (item, statusFilter, approvedSub, otherSub) => {
  const sk = item.statusKey;
  if (statusFilter === 'all') return true;
  if (statusFilter === 'pending') return PENDING_KEYS.includes(sk);
  if (statusFilter === 'approved') {
    if (approvedSub === 'accept') return ACCEPT_KEYS.includes(sk);
    if (approvedSub === 'reject') return REJECT_KEYS.includes(sk);
    return ACCEPT_KEYS.includes(sk) || REJECT_KEYS.includes(sk);
  }
  if (statusFilter === 'other') {
    if (otherSub === 'cancel') return CANCEL_KEYS.includes(sk);
    return EDIT_KEYS.includes(sk); // mặc định: chỉnh sửa
  }
  return true;
};

const APPROVED_SUBS = [
  { id: 'all',    label: 'Tất cả' },
  { id: 'accept', label: 'Chấp nhận' },
  { id: 'reject', label: 'Từ chối' },
];
const OTHER_SUBS = [
  { id: 'edit',   label: 'Chỉnh sửa' },
  { id: 'cancel', label: 'Yêu cầu hủy' },
];

const Badge = ({ meta }) => (
  <span className={`adm-ev-badge adm-ev-badge--${meta?.tone || 'slate'}`}>{meta?.label || '—'}</span>
);

const AdminDashboard = ({ showToast }) => {
  const [events, setEvents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const navigate = useNavigate();

  const [actedResults, setActedResults] = useState({}); // { [id]: 'approved' | 'rejected' }
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [approvedSub, setApprovedSub] = useState('all');
  const [otherSub, setOtherSub] = useState('edit');
  const [approvedOpen, setApprovedOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const approvedRef = useRef(null);
  const otherRef = useRef(null);
  useCloseOnClickOutside(approvedRef, approvedOpen, () => setApprovedOpen(false));
  useCloseOnClickOutside(otherRef, otherOpen, () => setOtherOpen(false));

  const userRole = normalizeRole(localStorage.getItem('userRole'));
  const canAccess = isCtsvRole(userRole) || isAdminRole(userRole);

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchCtsvEvents({ status: 'all' }).catch(() => ({ success: false, events: [] })),
      fetchCtsvProposals({ status: 'all' }).catch(() => ({ success: false, proposals: [] })),
    ])
      .then(([eventData, proposalData]) => {
        setEvents(eventData.events || []);
        setProposals(proposalData.proposals || []);
      })
      .catch(() => showToast('Lỗi máy chủ, không tải được dữ liệu.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    if (!canAccess) {
      showToast('Bạn không có quyền truy cập.', 'error');
      navigate('/profile');
      return;
    }
    loadAll();
  }, [canAccess, navigate, showToast, loadAll]);

  // Hợp nhất events + proposals thành một danh sách chuẩn hóa
  const items = useMemo(() => {
    const evItems = events.map((e) => ({
      key: `ev-${e.id || e._id}`,
      kind: 'event',
      id: e.id || e._id,
      title: e.title,
      source: e.source || 'club',
      statusKey: e.statusKey || e.status,
      organizer: e.createdByEmail || '—',
      category: e.category || '—',
      location: e.location || '—',
      date: e.date,
      time: e.time,
      startDate: e.startDate,
      createdAt: e.createdAt || e.startDate,
      totalTickets: e.totalTickets,
      ticketTypes: e.ticketTypes,
      ticketPrice: e.ticketPrice,
      thumbnail: e.thumbnail,
      description: e.description,
      eventId: e.id || e._id,
    }));
    const propItems = proposals.map((p) => ({
      key: `pr-${p.id}`,
      kind: 'proposal',
      id: p.id,
      title: p.title,
      source: 'club',
      statusKey: p.statusKey || p.status,
      organizer: p.clubName || '—',
      category: p.category || '—',
      location: p.location || '—',
      date: p.date,
      time: p.time,
      startDate: p.startDate,
      createdAt: p.startDate,
      totalTickets: p.totalTickets,
      ticketTypes: p.ticketTypes,
      ticketPrice: p.ticketPrice,
      thumbnail: p.image,
      description: p.description,
      eventId: p.eventId || null,
    }));
    const all = [...propItems, ...evItems];
    // Đang duyệt lên đầu, sau đó theo thời gian gửi mới nhất
    return all.sort((a, b) => {
      const ap = PENDING_KEYS.includes(a.statusKey) ? 0 : 1;
      const bp = PENDING_KEYS.includes(b.statusKey) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [events, proposals]);

  const filtered = useMemo(
    () => items.filter(
      (it) => matchSource(it, sourceFilter) && matchStatus(it, statusFilter, approvedSub, otherSub),
    ),
    [items, sourceFilter, statusFilter, approvedSub, otherSub],
  );

  const counts = useMemo(() => {
    const bySource = items.filter((it) => matchSource(it, sourceFilter));
    return {
      pending: bySource.filter((it) => PENDING_KEYS.includes(it.statusKey)).length,
      approved: bySource.filter((it) => ACCEPT_KEYS.includes(it.statusKey) || REJECT_KEYS.includes(it.statusKey)).length,
      other: bySource.filter((it) => EDIT_KEYS.includes(it.statusKey) || CANCEL_KEYS.includes(it.statusKey)).length,
      all: bySource.length,
    };
  }, [items, sourceFilter]);

  const handleApprove = async (item) => {
    setActingId(item.id);
    try {
      if (item.kind === 'proposal') {
        if (isIcpdpRole(userRole) && item.statusKey === 'pending_icpdp') {
          await icpdpApproveProposal(item.id);
        } else {
          await approveCtsvProposal(item.id);
        }
      } else if (item.source === 'school') {
        await approveAdminSchoolEvent(item.id);
      } else {
        await approveCtsvEvent(item.id);
      }
      setActedResults((prev) => ({ ...prev, [item.id]: 'approved' }));
      showToast('Đã duyệt thành công.', 'success');
    } catch (err) {
      showToast(err.message || 'Duyệt thất bại.', 'error');
      throw err;
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (item, reason) => {
    setActingId(item.id);
    try {
      if (item.kind === 'proposal') {
        await rejectCtsvProposal(item.id, reason);
      } else if (item.source === 'school') {
        await rejectAdminSchoolEvent(item.id, reason);
      } else {
        await rejectCtsvEvent(item.id, reason);
      }
      setActedResults((prev) => ({ ...prev, [item.id]: 'rejected' }));
      showToast('Đã từ chối.', 'info');
    } catch (err) {
      showToast(err.message || 'Từ chối thất bại.', 'error');
      throw err;
    } finally {
      setActingId(null);
    }
  };

  if (!canAccess) return null;

  const approvedPillLabel = statusFilter === 'approved' && approvedSub !== 'all'
    ? `Đã duyệt: ${APPROVED_SUBS.find((s) => s.id === approvedSub)?.label}`
    : 'Đã duyệt';
  const otherPillLabel = statusFilter === 'other'
    ? `Khác: ${OTHER_SUBS.find((s) => s.id === otherSub)?.label}`
    : 'Khác';

  return (
    <main className="admin-main admin-events-page">
      <header className="admin-events-page__header">
        <div className="admin-events-page__title-row">
          <div>
            <h1 className="admin-main__title">Duyệt đề xuất sự kiện</h1>
            <p className="admin-events-page__subtitle">
              Các đề xuất sự kiện từ CLB, sự kiện cấp trường và đối tác — lọc theo nguồn và trạng thái.
            </p>
          </div>
          {!loading && (
            <span className="admin-events-page__count" aria-live="polite">
              {filtered.length} mục
            </span>
          )}
        </div>
      </header>

      {/* Toolbar 2 nhóm pill */}
      <div className="adm-ev-toolbar">
        <div className="adm-ev-pills" role="group" aria-label="Lọc theo nguồn">
          {SOURCE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`adm-ev-pill${sourceFilter === f.id ? ' adm-ev-pill--active' : ''}`}
              onClick={() => setSourceFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="adm-ev-pills adm-ev-pills--right" role="group" aria-label="Lọc theo trạng thái">
          <button
            type="button"
            className={`adm-ev-pill${statusFilter === 'all' ? ' adm-ev-pill--active' : ''}`}
            onClick={() => { setStatusFilter('all'); setApprovedOpen(false); setOtherOpen(false); }}
          >
            Tất cả <span className="adm-ev-pill__count">{counts.all}</span>
          </button>
          <button
            type="button"
            className={`adm-ev-pill${statusFilter === 'pending' ? ' adm-ev-pill--active' : ''}`}
            onClick={() => { setStatusFilter('pending'); setApprovedOpen(false); setOtherOpen(false); }}
          >
            Đang duyệt <span className="adm-ev-pill__count">{counts.pending}</span>
          </button>

          {/* Đã duyệt + dropdown */}
          <div className="adm-ev-dropdown" ref={approvedRef}>
            <button
              type="button"
              className={`adm-ev-pill adm-ev-pill--caret${statusFilter === 'approved' ? ' adm-ev-pill--active' : ''}`}
              onClick={() => {
                if (statusFilter !== 'approved') setStatusFilter('approved');
                setApprovedOpen((o) => !o);
                setOtherOpen(false);
              }}
            >
              {approvedPillLabel} <span className="adm-ev-pill__count">{counts.approved}</span>
              <svg className="adm-ev-caret" viewBox="0 0 10 6" width="10" height="6" fill="currentColor" aria-hidden><path d="M0 0l5 6 5-6z" /></svg>
            </button>
            {approvedOpen && (
              <div className="adm-ev-menu">
                {APPROVED_SUBS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`adm-ev-menu-item${statusFilter === 'approved' && approvedSub === s.id ? ' adm-ev-menu-item--active' : ''}`}
                    onClick={() => { setStatusFilter('approved'); setApprovedSub(s.id); setApprovedOpen(false); }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Khác + dropdown */}
          <div className="adm-ev-dropdown" ref={otherRef}>
            <button
              type="button"
              className={`adm-ev-pill adm-ev-pill--caret${statusFilter === 'other' ? ' adm-ev-pill--active' : ''}`}
              onClick={() => {
                if (statusFilter !== 'other') setStatusFilter('other');
                setOtherOpen((o) => !o);
                setApprovedOpen(false);
              }}
            >
              {otherPillLabel} <span className="adm-ev-pill__count">{counts.other}</span>
              <svg className="adm-ev-caret" viewBox="0 0 10 6" width="10" height="6" fill="currentColor" aria-hidden><path d="M0 0l5 6 5-6z" /></svg>
            </button>
            {otherOpen && (
              <div className="adm-ev-menu">
                {OTHER_SUBS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`adm-ev-menu-item${statusFilter === 'other' && otherSub === s.id ? ' adm-ev-menu-item--active' : ''}`}
                    onClick={() => { setStatusFilter('other'); setOtherSub(s.id); setOtherOpen(false); }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="admin-events-page__loading">
          <span className="btn-spinner admin-events-page__spinner" aria-hidden="true" />
          <p>Đang tải dữ liệu…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-events-empty">
          <p className="admin-events-empty__title">Không có mục nào</p>
          <p className="admin-events-empty__hint">Thử đổi bộ lọc nguồn hoặc trạng thái phía trên.</p>
        </div>
      ) : (
        <ul className="admin-proposal-list">
          {filtered.map((item, index) => {
            const isBusy = actingId === item.id;
            const acted = actedResults[item.id];
            const isPending = PENDING_KEYS.includes(item.statusKey) && !acted;
            const detailHref = item.kind === 'event'
              ? (item.source === 'school' ? `/admin/ctsv/events/${item.id}` : `/events/${item.id}`)
              : (item.eventId ? `/events/${item.eventId}` : null);
            const statusBadge = acted === 'approved'
              ? { label: 'Đã phê duyệt', tone: 'green' }
              : acted === 'rejected'
                ? { label: 'Đã từ chối', tone: 'red' }
                : (STATUS_META[item.statusKey] || { label: item.statusKey, tone: 'slate' });
            return (
              <li key={item.key} className="admin-proposal-card">
                <div className="admin-proposal-card__head">
                  <div className="admin-proposal-card__head-main">
                    <span className="admin-proposal-card__index">#{index + 1}</span>
                    <h2 className="admin-proposal-card__title">{item.title}</h2>
                    <Badge meta={SOURCE_META[item.source]} />
                  </div>
                  <Badge meta={statusBadge} />
                </div>

                <div className="admin-proposal-card__body">
                  {item.thumbnail ? (
                    <div className="admin-proposal-card__thumb-wrap">
                      <img src={item.thumbnail} alt="" className="admin-proposal-card__thumb" />
                    </div>
                  ) : null}

                  <div className="admin-proposal-card__details">
                    <dl className="admin-proposal-meta">
                      <div className="admin-proposal-meta__row">
                        <dt>{item.kind === 'proposal' ? 'CLB' : 'Người gửi'}</dt>
                        <dd>{item.organizer}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Danh mục</dt>
                        <dd>{item.category}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Địa điểm</dt>
                        <dd>{item.location}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Thời gian</dt>
                        <dd>{item.date || formatDateTime(item.startDate)} {item.time || ''}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Tổng vé</dt>
                        <dd>{item.totalTickets != null ? item.totalTickets : '—'}</dd>
                      </div>
                    </dl>

                    <ProposalTicketsTable ticketTypes={item.ticketTypes} ticketPrice={item.ticketPrice} />

                    {item.description?.trim() ? (
                      <div className="admin-proposal-card__desc">
                        <p className="admin-proposal-card__desc-label">Mô tả</p>
                        <p className="admin-proposal-card__desc-text">{item.description}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {isPending ? (
                  <footer className="admin-proposal-card__footer">
                    <AdminProposalActions
                      itemTitle={item.title}
                      busy={isBusy}
                      disabled={actingId !== null && !isBusy}
                      onApprove={() => handleApprove(item)}
                      onReject={(reason) => handleReject(item, reason)}
                    />
                  </footer>
                ) : (acted || detailHref) ? (
                  <footer className="admin-proposal-card__footer">
                    <div className="adm-ev-detail-bar">
                      {acted && (
                        <span className={`adm-ev-acted-note adm-ev-acted-note--${acted}`}>
                          {acted === 'approved' ? '✓ Đã phê duyệt thành công' : '✕ Đã từ chối'}
                        </span>
                      )}
                      {detailHref && (
                        <button
                          type="button"
                          className="adm-ev-detail-btn"
                          onClick={() => navigate(detailHref)}
                        >
                          Xem chi tiết
                        </button>
                      )}
                    </div>
                  </footer>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
};

export default AdminDashboard;
