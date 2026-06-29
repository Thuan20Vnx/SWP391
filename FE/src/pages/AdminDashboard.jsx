import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminProposalActions from '../components/admin/AdminProposalActions';
import ProposalTicketsTable from '../components/admin/ProposalTicketsTable';
import EventPlanFilePanel from '../components/events/EventPlanFilePanel';
import TimelineSourceNotice from '../components/club/TimelineSourceNotice';
import useAdminEventsLiveStream from '../hooks/useAdminEventsLiveStream';
import { ADMIN_EVENTS_LIVE_EVENT } from '../utils/adminEventsLiveEvents';
import {
  approveCtsvEvent,
  approveCtsvProposal,
  fetchCtsvEventsForApproval,
  fetchCtsvProposalsForApproval,
  icpdpApproveProposal,
  rejectCtsvEvent,
  rejectCtsvProposal,
} from '../services/ctsvApi';
import {
  approveAdminSchoolEvent,
  rejectAdminSchoolEvent,
  fetchAdminPartners,
  approveAdminPartner,
  rejectAdminPartner,
} from '../services/adminApi';
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
  { id: 'ctsv',  label: 'CTSV' },
  { id: 'icpdp', label: 'IC-PDP' },
];

const CTSV_SUB_OPTS  = [{ id: 'all', label: 'Tất cả' }, { id: 'school', label: 'Cấp trường' }, { id: 'partner', label: 'Đối tác' }];
const ICPDP_SUB_OPTS = [{ id: 'all', label: 'Tất cả' }, { id: 'school', label: 'Cấp trường' }, { id: 'club',    label: 'CLB' }];

const SOURCE_META = {
  school:  { label: 'Cấp trường', tone: 'orange' },
  partner: { label: 'Đối tác',    tone: 'teal'   },
  club:    { label: 'CLB',        tone: 'indigo' },
};

const matchSource = (item, sourceFilter, ctsvSub, icpdpSub) => {
  if (sourceFilter === 'all') return true;
  if (sourceFilter === 'ctsv') {
    const inGroup = item.source === 'school' || item.source === 'partner';
    if (!inGroup) return false;
    return ctsvSub === 'all' || item.source === ctsvSub;
  }
  if (sourceFilter === 'icpdp') {
    const inGroup = item.source === 'club' || item.source === 'school';
    if (!inGroup) return false;
    return icpdpSub === 'all' || item.source === icpdpSub;
  }
  return true;
};

// --- Nhóm trạng thái (phải) ---
const PENDING_KEYS = ['pending', 'pending_icpdp', 'pending_ctsv', 'pending_admin'];
const ACCEPT_KEYS = ['approved', 'live', 'ended'];
const REJECT_KEYS = ['rejected'];
const EDIT_KEYS = ['revision', 'pending_edit', 'pending_icpdp_edit'];
const CANCEL_KEYS = [
  'pending_cancel',
  'pending_icpdp_cancel',
  'pending_postpone',
  'pending_icpdp_postpone',
  'pending_hide',
  'pending_delete',
  'pending_icpdp_delete',
];

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
  pending_icpdp_edit:    { label: 'Chờ duyệt sửa (ICPDP)', tone: 'orange' },
  pending_delete:        { label: 'Yêu cầu xóa',      tone: 'red'    },
  pending_icpdp_delete:  { label: 'Yêu cầu xóa (ICPDP)', tone: 'red' },
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

const PAGE_SIZE = 6;

const getSubmittedAtMs = (item) => {
  const values = [item.submittedAt, item.createdAt, item.updatedAt].filter(Boolean);
  if (!values.length) return 0;
  return Math.max(...values.map((v) => new Date(v).getTime()));
};

const resolveDetailHref = (item) => {
  if (item.kind === 'partner') return `/admin/ctsv/partners/${item.id}`;
  if (item.kind === 'proposal') {
    if (item.linkedEventId) return `/admin/ctsv/events/${item.linkedEventId}`;
    return `/admin/ctsv/proposals/${item.id}`;
  }
  if (item.kind === 'event') {
    if (item.source === 'school' || item.source === 'club') return `/admin/ctsv/events/${item.id}`;
    return `/events/${item.id}`;
  }
  return null;
};

const AdminDashboard = ({ showToast }) => {
  const [events, setEvents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [partnerRequests, setPartnerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const navigate = useNavigate();

  const [actedResults, setActedResults] = useState({}); // { [id]: 'approved' | 'rejected' }
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ctsvSub, setCtsvSub] = useState('all');
  const [icpdpSub, setIcpdpSub] = useState('all');
  const [ctsvOpen, setCtsvOpen] = useState(false);
  const [icpdpOpen, setIcpdpOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [approvedSub, setApprovedSub] = useState('all');
  const [otherSub, setOtherSub] = useState('edit');
  const [approvedOpen, setApprovedOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [page, setPage] = useState(1);
  const ctsvRef = useRef(null);
  const icpdpRef = useRef(null);
  const approvedRef = useRef(null);
  const otherRef = useRef(null);
  useCloseOnClickOutside(ctsvRef, ctsvOpen, () => setCtsvOpen(false));
  useCloseOnClickOutside(icpdpRef, icpdpOpen, () => setIcpdpOpen(false));
  useCloseOnClickOutside(approvedRef, approvedOpen, () => setApprovedOpen(false));
  useCloseOnClickOutside(otherRef, otherOpen, () => setOtherOpen(false));

  const userRole = normalizeRole(localStorage.getItem('userRole'));
  const canAccess = isCtsvRole(userRole) || isAdminRole(userRole);

  useAdminEventsLiveStream(canAccess);

  const loadAll = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    Promise.all([
      fetchCtsvEventsForApproval({ status: 'all' }).catch(() => ({ success: false, events: [] })),
      fetchCtsvProposalsForApproval({ status: 'all' }).catch(() => ({ success: false, proposals: [] })),
      isAdminRole(userRole)
        ? fetchAdminPartners('all').catch(() => ({ success: false, partners: [] }))
        : Promise.resolve({ success: false, partners: [] }),
    ])
      .then(([eventData, proposalData, partnerData]) => {
        setEvents(eventData.events || []);
        setProposals(proposalData.proposals || []);
        setPartnerRequests(partnerData.partners || []);
      })
      .catch(() => showToast('Lỗi máy chủ, không tải được dữ liệu.', 'error'))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [showToast, userRole]);

  useEffect(() => {
    if (!canAccess) {
      showToast('Bạn không có quyền truy cập.', 'error');
      navigate('/profile');
      return;
    }
    loadAll();
  }, [canAccess, navigate, showToast, loadAll]);

  useEffect(() => {
    if (!canAccess) return undefined;
    const onLive = () => loadAll({ silent: true });
    window.addEventListener(ADMIN_EVENTS_LIVE_EVENT, onLive);
    return () => window.removeEventListener(ADMIN_EVENTS_LIVE_EVENT, onLive);
  }, [canAccess, loadAll]);

  useEffect(() => {
    setPage(1);
  }, [sourceFilter, ctsvSub, icpdpSub, statusFilter, approvedSub, otherSub]);

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
      createdAt: e.createdAt || null,
      updatedAt: e.updatedAt || null,
      submittedAt: e.createdAt || e.updatedAt || null,
      totalTickets: e.totalTickets,
      ticketTypes: e.ticketTypes,
      ticketPrice: e.ticketPrice,
      thumbnail: e.thumbnail,
      description: e.description,
      eventId: e.id || e._id,
      hasEventPlan: e.hasEventPlan,
      eventPlanFile: e.eventPlanFile || '',
      eventPlanFileName: e.eventPlanFileName || '',
      eventPlanFileMime: e.eventPlanFileMime || '',
      eventPlanLink: e.eventPlanLink || '',
      linkedEventId: null,
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
      createdAt: p.createdAt || null,
      updatedAt: p.updatedAt || null,
      submittedAt: p.createdAt || p.updatedAt || null,
      totalTickets: p.totalTickets,
      ticketTypes: p.ticketTypes,
      ticketPrice: p.ticketPrice,
      thumbnail: p.image,
      description: p.description,
      eventId: p.eventId || null,
      linkedEventId: p.linkedEventId || null,
      hasEventPlan: p.hasEventPlan,
      eventPlanFile: p.eventPlanFile || '',
      eventPlanFileName: p.eventPlanFileName || '',
      eventPlanFileMime: p.eventPlanFileMime || '',
      eventPlanLink: p.eventPlanLink || '',
      timelineSource: p.timelineSource || null,
    }));
    const partnerItems = partnerRequests
      .filter((p) => ['pending_admin', 'approved', 'rejected'].includes(p.status))
      .map((p) => ({
      key: `pt-${p._id}`,
      kind: 'partner',
      id: p._id,
      title: p.proposedEventTitle || p.name,
      source: 'partner',
      statusKey: p.status,
      organizer: p.email || p.name || '—',
      category: p.category || '—',
      location: p.eventLocation || '—',
      date: null,
      time: '',
      startDate: p.eventStartDate || p.createdAt,
      createdAt: p.createdAt || null,
      updatedAt: p.updatedAt || null,
      submittedAt: p.ctsvApprovedAt || p.createdAt || p.updatedAt || null,
      totalTickets: p.eventTotalTickets,
      ticketTypes: p.eventTicketTypes || [],
      ticketPrice: 0,
      thumbnail: p.eventImage || '',
      description: p.description || '',
      eventId: null,
    }));
    const eventIds = new Set(evItems.map((e) => String(e.id)));
    const dedupedProps = propItems.filter((p) => {
      if (p.linkedEventId && eventIds.has(String(p.linkedEventId))) return false;
      if (p.eventId && eventIds.has(String(p.eventId))) return false;
      return true;
    });
    const all = [...dedupedProps, ...evItems, ...partnerItems];
    // Mới gửi / mới cập nhật lên đầu
    return all.sort((a, b) => {
      const diff = getSubmittedAtMs(b) - getSubmittedAtMs(a);
      if (diff !== 0) return diff;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [events, proposals, partnerRequests]);

  const filtered = useMemo(
    () => items.filter(
      (it) => matchSource(it, sourceFilter, ctsvSub, icpdpSub) && matchStatus(it, statusFilter, approvedSub, otherSub),
    ),
    [items, sourceFilter, ctsvSub, icpdpSub, statusFilter, approvedSub, otherSub],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    const start = Math.max(1, Math.min(page - 2, totalPages - maxButtons + 1));
    const end = Math.min(totalPages, start + maxButtons - 1);
    const nums = [];
    for (let i = start; i <= end; i += 1) nums.push(i);
    return nums;
  }, [page, totalPages]);

  const pageStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, filtered.length);

  const counts = useMemo(() => {
    const bySource = items.filter((it) => matchSource(it, sourceFilter, ctsvSub, icpdpSub));
    return {
      pending: bySource.filter((it) => PENDING_KEYS.includes(it.statusKey)).length,
      approved: bySource.filter((it) => ACCEPT_KEYS.includes(it.statusKey) || REJECT_KEYS.includes(it.statusKey)).length,
      other: bySource.filter((it) => EDIT_KEYS.includes(it.statusKey) || CANCEL_KEYS.includes(it.statusKey)).length,
      all: bySource.length,
    };
  }, [items, sourceFilter, ctsvSub, icpdpSub]);

  const handleApprove = async (item) => {
    if (item.statusKey === 'pending_icpdp' && !isIcpdpRole(userRole)) {
      showToast('Đề xuất đang chờ IC-PDP duyệt nội bộ.', 'error');
      return;
    }
    setActingId(item.id);
    try {
      if (item.kind === 'partner') {
        await approveAdminPartner(item.id);
      } else if (item.kind === 'proposal') {
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
      if (item.kind === 'partner') {
        await rejectAdminPartner(item.id, reason);
      } else if (item.kind === 'proposal') {
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
          <button
            type="button"
            className={`adm-ev-pill${sourceFilter === 'all' ? ' adm-ev-pill--active' : ''}`}
            onClick={() => { setSourceFilter('all'); setCtsvOpen(false); setIcpdpOpen(false); }}
          >Tất cả</button>

          {/* CTSV pill + dropdown */}
          <div ref={ctsvRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`adm-ev-pill${sourceFilter === 'ctsv' ? ' adm-ev-pill--active' : ''}`}
              onClick={() => { setSourceFilter('ctsv'); setCtsvOpen(o => !o); setIcpdpOpen(false); }}
            >
              CTSV {ctsvSub !== 'all' && `· ${CTSV_SUB_OPTS.find(o => o.id === ctsvSub)?.label}`} ▾
            </button>
            {ctsvOpen && (
              <div className="adm-ev-menu">
                {CTSV_SUB_OPTS.map(o => (
                  <button key={o.id} type="button"
                    className={`adm-ev-menu-item${ctsvSub === o.id ? ' adm-ev-menu-item--active' : ''}`}
                    onClick={() => { setCtsvSub(o.id); setCtsvOpen(false); }}
                  >{o.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* IC-PDP pill + dropdown */}
          <div ref={icpdpRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`adm-ev-pill${sourceFilter === 'icpdp' ? ' adm-ev-pill--active' : ''}`}
              onClick={() => { setSourceFilter('icpdp'); setIcpdpOpen(o => !o); setCtsvOpen(false); }}
            >
              IC-PDP {icpdpSub !== 'all' && `· ${ICPDP_SUB_OPTS.find(o => o.id === icpdpSub)?.label}`} ▾
            </button>
            {icpdpOpen && (
              <div className="adm-ev-menu">
                {ICPDP_SUB_OPTS.map(o => (
                  <button key={o.id} type="button"
                    className={`adm-ev-menu-item${icpdpSub === o.id ? ' adm-ev-menu-item--active' : ''}`}
                    onClick={() => { setIcpdpSub(o.id); setIcpdpOpen(false); }}
                  >{o.label}</button>
                ))}
              </div>
            )}
          </div>
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
          {pageItems.map((item, index) => {
            const isBusy = actingId === item.id;
            const acted = actedResults[item.id];
            const isPending = PENDING_KEYS.includes(item.statusKey) && !acted;
            const awaitsIcpdp = item.statusKey === 'pending_icpdp' && isAdminRole(userRole);
            const canActOnList = isPending && !awaitsIcpdp;
            const detailHref = resolveDetailHref(item);
            const listIndex = (page - 1) * PAGE_SIZE + index;
            const showPlanPanel =
              item.hasEventPlan
              || item.eventPlanFile
              || item.eventPlanLink
              || item.eventPlanFileName;
            const statusBadge = acted === 'approved'
              ? { label: 'Đã phê duyệt', tone: 'green' }
              : acted === 'rejected'
                ? { label: 'Đã từ chối', tone: 'red' }
                : (STATUS_META[item.statusKey] || { label: item.statusKey, tone: 'slate' });
            return (
              <li key={item.key} className="admin-proposal-card">
                <div className="admin-proposal-card__head">
                  <div className="admin-proposal-card__head-main">
                    <span className="admin-proposal-card__index">#{listIndex + 1}</span>
                    <h2 className="admin-proposal-card__title">{item.title}</h2>
                    <TimelineSourceNotice source={item} className="admin-proposal-card__timeline-source" />
                    <Badge meta={SOURCE_META[item.source]} />
                    {showPlanPanel && (
                      <span className="adm-ev-plan-badge">Có bảng KH</span>
                    )}
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
                  </div>
                </div>

                <div className="admin-proposal-card__full">
                    <ProposalTicketsTable ticketTypes={item.ticketTypes} ticketPrice={item.ticketPrice} />

                    {item.description?.trim() ? (
                      <div className="admin-proposal-card__desc">
                        <p className="admin-proposal-card__desc-label">Mô tả</p>
                        <p className="admin-proposal-card__desc-text">{item.description}</p>
                      </div>
                    ) : null}

                    {showPlanPanel && (
                      <div className="admin-fpt-unit-events__plan-panel">
                        <EventPlanFilePanel
                          fileUrl={item.eventPlanUrl || item.eventPlanFile}
                          fileName={item.eventPlanFileName}
                          mimeType={item.eventPlanFileMime}
                          externalLink={item.eventPlanLink}
                        />
                      </div>
                    )}
                </div>

                {canActOnList ? (
                  <footer className="admin-proposal-card__footer">
                    <AdminProposalActions
                      itemTitle={item.title}
                      busy={isBusy}
                      disabled={actingId !== null && !isBusy}
                      onApprove={() => handleApprove(item)}
                      onReject={(reason) => handleReject(item, reason)}
                    />
                  </footer>
                ) : awaitsIcpdp ? (
                  <footer className="admin-proposal-card__footer">
                    <div className="adm-ev-detail-bar">
                      <span className="adm-ev-acted-note">
                        Chờ IC-PDP duyệt nội bộ — Admin xử lý sau khi IC-PDP chuyển tiếp.
                      </span>
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

      {!loading && filtered.length > PAGE_SIZE && (
        <footer className="adm-ev-pagination adm-ev-pagination--numbered">
          <p className="adm-ev-pagination__info">
            Hiển thị {pageStart}–{pageEnd} / {filtered.length} mục
          </p>
          <nav className="adm-ev-pagination__nav" aria-label="Phân trang danh sách duyệt">
            <button
              type="button"
              className="adm-ev-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Trang trước"
            >
              ‹
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                className={`adm-ev-page-btn${page === n ? ' adm-ev-page-btn--active' : ''}`}
                onClick={() => setPage(n)}
                aria-current={page === n ? 'page' : undefined}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="adm-ev-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Trang sau"
            >
              ›
            </button>
          </nav>
        </footer>
      )}
    </main>
  );
};

export default AdminDashboard;
