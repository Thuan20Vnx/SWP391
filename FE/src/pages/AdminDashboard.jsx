import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPortalListLayout from '../components/admin/AdminPortalListLayout';
import AdminStlFilterDropdown from '../components/admin/AdminStlFilterDropdown';
import ClubTablePagination from '../components/ui/ClubTablePagination';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PartnerActionDialog from '../components/ctsv/PartnerActionDialog';
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
  approveAdminModeration,
  rejectAdminModeration,
  fetchAdminPartners,
  approveAdminPartner,
  rejectAdminPartner,
} from '../services/adminApi';
import { MODERATION_PENDING_STATUSES } from '../constants/eventModeration';
import { isAdminRole, isCtsvRole, isIcpdpRole, normalizeRole } from '../utils/auth';
import { formatPortalDate, toStlBadgeTone } from '../utils/adminStlBadge';
import '../styles/admin-dashboard.css';


// --- Phân loại nguồn (trái) ---
const SOURCE_FILTERS = [
  { id: 'all',   label: 'Tất cả' },
  { id: 'ctsv',  label: 'CTSV' },
  { id: 'icpdp', label: 'IC-PDP' },
];


const SOURCE_META = {
  school: { label: 'Cấp trường', tone: 'orange' },
  partner: { label: 'Đối tác', tone: 'green' },
  club: { label: 'CLB', tone: 'blue' },
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

const SOURCE_DROPDOWN_OPTIONS = [
  { id: 'all', label: 'Tất cả nguồn' },
  { id: 'ctsv:all', label: 'CTSV — Tất cả' },
  { id: 'ctsv:school', label: 'CTSV — Cấp trường' },
  { id: 'ctsv:partner', label: 'CTSV — Đối tác' },
  { id: 'icpdp:all', label: 'IC-PDP — Tất cả' },
  { id: 'icpdp:school', label: 'IC-PDP — Cấp trường' },
  { id: 'icpdp:club', label: 'IC-PDP — CLB' },
];

const STATUS_DROPDOWN_OPTIONS = [
  { id: 'all', label: 'Tất cả trạng thái' },
  { id: 'pending', label: 'Đang duyệt' },
  { id: 'approved:all', label: 'Đã duyệt — Tất cả' },
  { id: 'approved:accept', label: 'Đã duyệt — Chấp nhận' },
  { id: 'approved:reject', label: 'Đã duyệt — Từ chối' },
  { id: 'other:edit', label: 'Khác — Chỉnh sửa' },
  { id: 'other:cancel', label: 'Khác — Yêu cầu hủy' },
];

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
    if (item.source === 'school' || item.source === 'club') {
      const needsCoordTab =
        MODERATION_PENDING_STATUSES.includes(item.statusKey) || item.statusKey === 'pending_admin';
      return `/admin/ctsv/events/${item.id}${needsCoordTab ? '?tab=dieu-phoi' : ''}`;
    }
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

  const [actedResults, setActedResults] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ctsvSub, setCtsvSub] = useState('all');
  const [icpdpSub, setIcpdpSub] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [approvedSub, setApprovedSub] = useState('all');
  const [otherSub, setOtherSub] = useState('edit');
  const [page, setPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (!matchSource(it, sourceFilter, ctsvSub, icpdpSub)) return false;
      if (!matchStatus(it, statusFilter, approvedSub, otherSub)) return false;
      if (!q) return true;
      return (
        (it.title || '').toLowerCase().includes(q) ||
        (it.organizer || '').toLowerCase().includes(q) ||
        (it.location || '').toLowerCase().includes(q)
      );
    });
  }, [items, sourceFilter, ctsvSub, icpdpSub, statusFilter, approvedSub, otherSub, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [sourceFilter, ctsvSub, icpdpSub, statusFilter, approvedSub, otherSub, searchQuery]);

  const sourceDropdownValue = useMemo(() => {
    if (sourceFilter === 'all') return 'all';
    if (sourceFilter === 'ctsv') return `ctsv:${ctsvSub}`;
    if (sourceFilter === 'icpdp') return `icpdp:${icpdpSub}`;
    return 'all';
  }, [sourceFilter, ctsvSub, icpdpSub]);

  const statusDropdownValue = useMemo(() => {
    if (statusFilter === 'all') return 'all';
    if (statusFilter === 'pending') return 'pending';
    if (statusFilter === 'approved') return `approved:${approvedSub}`;
    if (statusFilter === 'other') return `other:${otherSub}`;
    return 'all';
  }, [statusFilter, approvedSub, otherSub]);

  const handleSourceDropdown = (value) => {
    if (value === 'all') {
      setSourceFilter('all');
      return;
    }
    const [group, sub] = value.split(':');
    setSourceFilter(group);
    if (group === 'ctsv') setCtsvSub(sub || 'all');
    if (group === 'icpdp') setIcpdpSub(sub || 'all');
  };

  const handleStatusDropdown = (value) => {
    if (value === 'all') {
      setStatusFilter('all');
      return;
    }
    if (value === 'pending') {
      setStatusFilter('pending');
      return;
    }
    const [group, sub] = value.split(':');
    if (group === 'approved') {
      setStatusFilter('approved');
      setApprovedSub(sub || 'all');
      return;
    }
    if (group === 'other') {
      setStatusFilter('other');
      setOtherSub(sub || 'edit');
    }
  };

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
        if (MODERATION_PENDING_STATUSES.includes(item.statusKey)) {
          await approveAdminModeration(item.id);
        } else {
          await approveAdminSchoolEvent(item.id);
        }
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
        if (MODERATION_PENDING_STATUSES.includes(item.statusKey)) {
          await rejectAdminModeration(item.id, reason);
        } else {
          await rejectAdminSchoolEvent(item.id, reason);
        }
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

  const pendingHint = !loading && counts.pending > 0 ? `${counts.pending} đang chờ duyệt` : null;

  return (
    <main className="admin-main">
      <AdminPortalListLayout
        eyebrow="Admin · Phê duyệt"
        title="Duyệt đề xuất sự kiện"
        description="Đề xuất từ CLB, sự kiện cấp trường và đối tác — lọc theo nguồn, trạng thái và tìm kiếm nhanh."
        statNum={loading ? '—' : filtered.length}
        statLabel={statusFilter === 'all' && sourceFilter === 'all' ? 'Mục' : 'Mục (bộ lọc)'}
        statHint={pendingHint}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm tên sự kiện, CLB, địa điểm…"
        filterSlot={(
          <>
            <AdminStlFilterDropdown
              label="Nguồn"
              value={sourceDropdownValue}
              options={SOURCE_DROPDOWN_OPTIONS}
              onChange={handleSourceDropdown}
              ariaLabel="Lọc theo nguồn"
            />
            <AdminStlFilterDropdown
              label="Trạng thái"
              value={statusDropdownValue}
              options={STATUS_DROPDOWN_OPTIONS}
              onChange={handleStatusDropdown}
              ariaLabel="Lọc theo trạng thái"
            />
          </>
        )}
        summaryText={loading ? null : (
          <>
            <strong>{filtered.length}</strong> mục
            {searchQuery.trim() ? ` · «${searchQuery.trim()}»` : ''}
          </>
        )}
        loading={loading}
        footer={
          !loading && filtered.length > PAGE_SIZE ? (
            <ClubTablePagination
              page={page}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          ) : null
        }
      >
        <section className="stl-card">
          <div className="stl-table-wrap">
            <table className="stl-table">
              <thead>
                <tr>
                  <th>Đề xuất / Sự kiện</th>
                  <th className="col-center">Nguồn</th>
                  <th>Người gửi</th>
                  <th className="col-center">Gửi lúc</th>
                  <th className="col-center">Trạng thái</th>
                  <th className="col-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="stl-row--skeleton">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j}><div className="stl-sk stl-sk--sm" /></td>
                      ))}
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="stl-empty">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" aria-hidden>
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <p>Không có mục nào.</p>
                        <p className="stl-empty-hint">Thử đổi bộ lọc nguồn, trạng thái hoặc từ khóa.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  pageItems.map((item) => {
                    const isBusy = actingId === item.id;
                    const acted = actedResults[item.id];
                    const isPending = PENDING_KEYS.includes(item.statusKey) && !acted;
                    const awaitsIcpdp = item.statusKey === 'pending_icpdp' && isAdminRole(userRole);
                    const canActOnList = isPending && !awaitsIcpdp;
                    const detailHref = resolveDetailHref(item);
                    const statusBadge = acted === 'approved'
                      ? { label: 'Đã phê duyệt', tone: 'green' }
                      : acted === 'rejected'
                        ? { label: 'Đã từ chối', tone: 'red' }
                        : (STATUS_META[item.statusKey] || { label: item.statusKey, tone: 'amber' });
                    const srcMeta = SOURCE_META[item.source] || { label: item.source || '—', tone: 'amber' };

                    return (
                      <tr key={item.key} className="stl-row">
                        <td>
                          {detailHref ? (
                            <button
                              type="button"
                              className="stl-club-name stl-timeline-semester-btn"
                              onClick={() => navigate(detailHref)}
                            >
                              {item.title || '—'}
                            </button>
                          ) : (
                            <span className="stl-club-name">{item.title || '—'}</span>
                          )}
                          <p className="stl-timeline-summary">
                            {[item.category, item.location].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </td>
                        <td className="col-center">
                          <span className={`stl-badge stl-badge--${toStlBadgeTone(srcMeta.tone)}`}>
                            {srcMeta.label}
                          </span>
                        </td>
                        <td className="stl-semester">{item.organizer || '—'}</td>
                        <td className="col-center stl-date">
                          {formatPortalDate(item.submittedAt || item.createdAt)}
                        </td>
                        <td className="col-center">
                          <span className={`stl-badge stl-badge--${toStlBadgeTone(statusBadge.tone)}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="col-center">
                          <div className="stl-timeline-actions">
                            {canActOnList && (
                              <button
                                type="button"
                                className="stl-action-btn stl-action-btn--primary"
                                disabled={isBusy || (actingId !== null && !isBusy)}
                                onClick={() => setApproveTarget(item)}
                              >
                                Duyệt
                              </button>
                            )}
                            {canActOnList && (
                              <button
                                type="button"
                                className="stl-action-btn stl-action-btn--danger"
                                disabled={isBusy || (actingId !== null && !isBusy)}
                                onClick={() => setRejectTarget(item)}
                              >
                                Từ chối
                              </button>
                            )}
                            {detailHref && (
                              <button
                                type="button"
                                className="stl-action-btn"
                                onClick={() => navigate(detailHref)}
                              >
                                Chi tiết
                              </button>
                            )}
                            {awaitsIcpdp && (
                              <span className="stl-timeline-summary" style={{ margin: 0 }}>
                                Chờ IC-PDP
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </AdminPortalListLayout>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        title="Phê duyệt đề xuất"
        message={
          approveTarget?.title
            ? `Xác nhận phê duyệt «${approveTarget.title}»?`
            : 'Xác nhận phê duyệt mục này?'
        }
        confirmLabel="Phê duyệt"
        loading={actingId !== null}
        onCancel={() => !actingId && setApproveTarget(null)}
        onConfirm={async () => {
          if (!approveTarget) return;
          try {
            await handleApprove(approveTarget);
            setApproveTarget(null);
          } catch {
            /* toast in handleApprove */
          }
        }}
      />

      <PartnerActionDialog
        open={Boolean(rejectTarget)}
        mode="proposalReject"
        loading={actingId !== null}
        onCancel={() => !actingId && setRejectTarget(null)}
        onConfirm={async (reason) => {
          if (!rejectTarget) return;
          try {
            await handleReject(rejectTarget, reason);
            setRejectTarget(null);
          } catch {
            /* toast in handleReject */
          }
        }}
      />
    </main>
  );
};

export default AdminDashboard;
