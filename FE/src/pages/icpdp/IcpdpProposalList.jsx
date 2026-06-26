import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

import ClubTablePagination from '../../components/ui/ClubTablePagination';
import {
  fetchIcpdpPendingModerations,
  fetchIcpdpProposalsForApproval,
} from '../../services/icpdpApi';
import { SCHOOL_EVENT_STATUS_LABELS } from '../../constants/eventWorkflow';
import { MODERATION_ACTION_LABELS } from '../../constants/eventModeration';
import { PORTAL_EVENTS_LIVE_EVENT } from '../../utils/adminEventsLiveEvents';
import '../ClubManagement.css';

const PAGE_SIZE = 10;

const showsModerationQueue = (status) => !status || status === 'pending_icpdp';

const getItemSubmittedAtMs = (item) => {
  if (item.kind === 'moderation') {
    return new Date(item.data.moderationRequestedAt || item.data.updatedAt || item.data.createdAt || 0).getTime();
  }
  return Math.max(
    new Date(item.data.createdAt || 0).getTime(),
    new Date(item.data.updatedAt || 0).getTime()
  );
};

const getStatusMeta = (item) => {
  const key = item.data.statusKey || item.data.status;
  if (key === 'approved') return { label: 'Đã duyệt', tone: 'approved' };
  if (key === 'rejected') return { label: 'Từ chối', tone: 'rejected' };
  if (key === 'revision') return { label: 'Cần chỉnh sửa', tone: 'pending' };
  if (key === 'pending_admin') return { label: 'Chờ Admin', tone: 'pending' };
  if (key?.startsWith('pending_icpdp')) {
    return { label: SCHOOL_EVENT_STATUS_LABELS[key] || 'Chờ IC-PDP', tone: 'pending' };
  }
  if (key?.startsWith('pending')) return { label: 'Đang duyệt', tone: 'pending' };
  return { label: item.data.status || 'Không rõ', tone: 'pending' };
};

const getDetailPath = (item) => {
  if (item.kind === 'moderation') return `/icpdp/events/${item.data.id}`;
  return `/icpdp/proposals/${item.data.id}`;
};

const IcpdpProposalList = () => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { showToast, headerSearch = '', registerHeaderSearchSubmit } = outlet;
  const [proposals, setProposals] = useState([]);
  const [moderations, setModerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_icpdp');
  const [page, setPage] = useState(1);

  const searchQuery = headerSearch.trim() || localSearch.trim();
  const loadSeqRef = useRef(0);
  const liveTimerRef = useRef(null);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const loadData = useCallback(
    async ({ silent = false, overrideStatus } = {}) => {
      const status = overrideStatus ?? statusFilter;
      const seq = ++loadSeqRef.current;
      if (!silent) setLoading(true);

      const params = {};
      if (status) params.status = status;

      let nextProposals = [];
      let nextModerations = [];
      let hadError = false;

      try {
        const proposalResult = await fetchIcpdpProposalsForApproval(params).catch((err) => {
          hadError = true;
          console.error('fetchIcpdpProposalsForApproval:', err);
          return { proposals: [] };
        });
        if (seq !== loadSeqRef.current) return;
        nextProposals = proposalResult.proposals || [];

        if (showsModerationQueue(status)) {
          const moderationResult = await fetchIcpdpPendingModerations().catch((err) => {
            hadError = true;
            console.error('fetchIcpdpPendingModerations:', err);
            return { events: [] };
          });
          if (seq !== loadSeqRef.current) return;
          nextModerations = moderationResult.events || [];
        }

        setProposals(nextProposals);
        setModerations(nextModerations);
        if (hadError) {
          showToastRef.current?.('Một phần dữ liệu không tải được. Hiển thị kết quả khả dụng.', 'error');
        }
      } catch (err) {
        console.error('loadIcpdpProposals:', err);
        if (seq === loadSeqRef.current) {
          setProposals([]);
          setModerations([]);
          showToastRef.current?.('Không tải được danh sách đề xuất.', 'error');
        }
      } finally {
        if (!silent && seq === loadSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [statusFilter]
  );

  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  useEffect(() => {
    loadDataRef.current();
  }, [statusFilter]);

  useEffect(() => {
    const onLive = () => {
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = setTimeout(() => {
        loadDataRef.current({ silent: true });
      }, 400);
    };
    window.addEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
    return () => {
      clearTimeout(liveTimerRef.current);
      window.removeEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
    };
  }, []);

  useEffect(() => {
    registerHeaderSearchSubmit?.(() => {});
    return () => registerHeaderSearchSubmit?.(null);
  }, [registerHeaderSearchSubmit]);

  const mergedItems = useMemo(() => {
    const proposalItems = proposals.map((p) => ({ kind: 'proposal', id: `proposal-${p.id}`, data: p }));
    const moderationItems = showsModerationQueue(statusFilter)
      ? moderations.map((e) => ({ kind: 'moderation', id: `moderation-${e.id}`, data: e }))
      : [];
    return [...proposalItems, ...moderationItems].sort(
      (a, b) => getItemSubmittedAtMs(b) - getItemSubmittedAtMs(a)
    );
  }, [proposals, moderations, statusFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return mergedItems;
    return mergedItems.filter(({ kind, data }) => {
      const title = (data.title || '').toLowerCase();
      const club = (data.clubName || '').toLowerCase();
      if (kind === 'moderation') {
        const action = (data.moderationAction || '').toLowerCase();
        return title.includes(q) || club.includes(q) || action.includes(q);
      }
      return title.includes(q) || club.includes(q);
    });
  }, [mergedItems, searchQuery]);

  const filterTabs = useMemo(() => {
    const pending = proposals.filter((p) => p.statusKey === 'pending_icpdp').length + moderations.length;
    return [
      { key: 'pending_icpdp', label: 'Chờ IC-PDP', count: pending },
      { key: '', label: 'Tất cả', count: mergedItems.length },
      { key: 'pending_admin', label: 'Chờ Admin', count: proposals.filter((p) => p.statusKey === 'pending_admin').length },
      { key: 'approved', label: 'Đã duyệt', count: proposals.filter((p) => p.statusKey === 'approved').length },
      { key: 'revision', label: 'Cần chỉnh sửa', count: proposals.filter((p) => p.statusKey === 'revision').length },
      { key: 'rejected', label: 'Từ chối', count: proposals.filter((p) => p.statusKey === 'rejected').length },
    ];
  }, [proposals, moderations.length, mergedItems.length]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  const handleFilterChange = (key) => {
    setStatusFilter(key);
  };

  return (
    <div className="clb-management-content icpdp-proposals-table-page">
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">Duyệt đề xuất sự kiện CLB</h1>
          <p className="clb-page-subtitle">
            Xét duyệt đề xuất mới và yêu cầu hoãn/hủy từ Ban chủ nhiệm CLB —{' '}
            <strong>{filtered.length}</strong> hồ sơ.
          </p>
        </div>
      </div>

      <div className="icpdp-proposals-search-inline">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3-3" />
        </svg>
        <input
          type="search"
          placeholder="Tìm theo tên sự kiện, CLB…"
          value={headerSearch || localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          aria-label="Tìm đề xuất"
        />
      </div>

      <div className="clb-filter-tabs">
        {filterTabs.map((f) => (
          <button
            key={f.key || 'all'}
            type="button"
            className={`clb-filter-tab clb-filter-tab--${f.key === 'pending_icpdp' ? 'pending' : f.key || 'all'}${statusFilter === f.key ? ' is-active' : ''}`}
            onClick={() => handleFilterChange(f.key)}
          >
            <span className="clb-filter-tab__label">{f.label}</span>
            <span className="clb-filter-tab__count">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="clb-table-wrapper">
        <div className="clb-table-scroll">
          <table className="clb-table">
            <thead>
              <tr>
                <th>TÊN SỰ KIỆN</th>
                <th>CÂU LẠC BỘ</th>
                <th>THỂ LOẠI</th>
                <th>THỜI GIAN</th>
                <th>SỐ SLOT</th>
                <th>TRẠNG THÁI</th>
                <th className="clb-table-col-action">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="clb-panel-empty-cell">Đang tải...</td></tr>
              ) : pageItems.length === 0 ? (
                <tr><td colSpan={7} className="clb-panel-empty-cell">Không có hồ sơ nào phù hợp.</td></tr>
              ) : (
                pageItems.map((item) => {
                  const ev = item.data;
                  const { label, tone } = getStatusMeta(item);
                  const startDate = ev.startDate ? new Date(ev.startDate).toLocaleDateString('vi-VN') : (ev.date || '--');
                  const startTime = ev.startDate
                    ? new Date(ev.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : (ev.time || '--');
                  const reg = ev.registeredCount || 0;
                  const cap = ev.capacity || ev.totalTickets || 0;
                  const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
                  const moderationLabel = item.kind === 'moderation'
                    ? MODERATION_ACTION_LABELS[ev.moderationAction] || ''
                    : '';

                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="clb-event-name">{ev.title}</span>
                        {moderationLabel && (
                          <span className="clb-table-sub">{moderationLabel}</span>
                        )}
                      </td>
                      <td>{ev.clubName || '—'}</td>
                      <td><span className="clb-table-chip">{ev.category || 'Khác'}</span></td>
                      <td>
                        <div className="clb-table-date">
                          <strong>{startDate}</strong>
                          <span>{startTime}</span>
                        </div>
                      </td>
                      <td>
                        {cap > 0 ? (
                          <div className="clb-slot-cell">
                            <span className="clb-slot-nums">{reg}/{cap}</span>
                            <div className="clb-slot-bar-bg">
                              <div className="clb-slot-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="clb-slot-nums">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`clb-table-status clb-table-status--${tone}`}>{label}</span>
                      </td>
                      <td className="clb-table-col-action">
                        <div className="clb-table-actions">
                          <button
                            type="button"
                            className="clb-action-btn clb-action-btn--info"
                            title="Xem chi tiết"
                            aria-label={`Xem chi tiết ${ev.title}`}
                            onClick={() => navigate(getDetailPath(item))}
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                              <path d="M12 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              <circle cx="12" cy="7.5" r="1.25" fill="currentColor" />
                            </svg>
                          </button>
                          <span className="clb-action-btn-spacer" aria-hidden="true" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ClubTablePagination
          page={pageSafe}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </div>
    </div>
  );
};

export default IcpdpProposalList;
