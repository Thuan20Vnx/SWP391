import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchIcpdpSemesterTimelines } from '../../services/icpdpApi';
import { getUserRole } from '../../utils/auth';
import { useCloseOnClickOutside } from '../../hooks/useCloseOnClickOutside';
import { TIMELINE_LIVE_EVENT } from '../../utils/timelineLiveEvents';

const ADMIN_STATUS_FILTERS = [
  { id: 'pending_admin',  label: 'Chờ Admin duyệt' },
  { id: 'pending_icpdp',  label: 'Chờ IC-PDP' },
  { id: 'approved',       label: 'Đã duyệt' },
  { id: 'revision',       label: 'Cần chỉnh sửa' },
  { id: 'rejected',       label: 'Từ chối' },
  { id: 'all',            label: 'Tất cả' },
];

const ICPDP_STATUS_FILTERS = [
  { id: '',              label: 'Chờ xử lý' },
  { id: 'pending_icpdp', label: 'Chờ IC-PDP' },
  { id: 'pending_admin', label: 'Chờ Admin' },
  { id: 'approved',      label: 'Đã duyệt' },
  { id: 'revision',      label: 'Cần chỉnh sửa' },
  { id: 'rejected',      label: 'Từ chối' },
  { id: 'all',           label: 'Tất cả' },
];

const STATUS_META = {
  pending_icpdp: { label: 'Chờ IC-PDP',     tone: 'amber'  },
  pending_admin: { label: 'Chờ Admin',       tone: 'blue'   },
  approved:      { label: 'Đã duyệt',        tone: 'green'  },
  revision:      { label: 'Cần chỉnh sửa',   tone: 'orange' },
  rejected:      { label: 'Từ chối',         tone: 'red'    },
  cancelled:     { label: 'CLB đã hủy',      tone: 'slate'  },
};

const emptyTimelineHint = (statusFilter, isAdmin) => {
  if (statusFilter === 'all') return 'Chưa có timeline nào trong hệ thống.';
  if (statusFilter === '' || statusFilter === 'pending_icpdp' || statusFilter === 'pending_admin') {
    return isAdmin
      ? 'Không có timeline chờ Admin duyệt. Thử bộ lọc «Tất cả» để xem lịch sử.'
      : 'Không có timeline chờ IC-PDP xử lý. CLB hủy đơn hoặc timeline đã duyệt nằm ở bộ lọc «Tất cả».';
  }
  return 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.';
};

const fmt = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const resolveTimelineMeta = (tl) => {
  const badgeKey = tl.statusBadgeKey || tl.statusKey;
  if (STATUS_META[badgeKey]) {
    return { label: tl.status || STATUS_META[badgeKey].label, tone: STATUS_META[badgeKey].tone };
  }
  return { label: tl.status || '—', tone: 'slate' };
};

const isTimelinePendingReview = (tl, isAdmin) => {
  if (isAdmin) {
    return tl.statusKey === 'pending_admin' || tl.changeRequest?.statusKey === 'pending_admin';
  }
  return tl.statusKey === 'pending_icpdp' || tl.changeRequest?.statusKey === 'pending_icpdp';
};

const ADMIN_OWNER_FILTERS = [
  { id: 'all', label: 'Tất cả đơn vị' },
  { id: 'club', label: 'CLB' },
  { id: 'icpdp', label: 'IC-PDP' },
  { id: 'ctsv', label: 'CTSV' },
];

const IcpdpSemesterTimelineList = () => {
  const { showToast, headerSearch = '' } = useOutletContext() || {};

  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';
  const detailBase = isAdmin ? '/admin/semester-timelines' : '/icpdp/semester-timelines';
  const STATUS_FILTERS = isAdmin ? ADMIN_STATUS_FILTERS : ICPDP_STATUS_FILTERS;

  const [statusFilter, setStatusFilter] = useState(isAdmin ? 'pending_admin' : '');
  const [ownerTypeFilter, setOwnerTypeFilter] = useState(isAdmin ? 'all' : 'club');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(
    ({ silent = false, overrideStatus } = {}) => {
      const status = overrideStatus ?? statusFilter;
      if (!silent) setLoading(true);
      const params = {};
      if (status) params.status = status;
      if (isAdmin) params.ownerType = ownerTypeFilter;
      return fetchIcpdpSemesterTimelines(params)
        .then((d) => setTimelines(d.timelines || []))
        .catch(() => showToast?.('Không tải được danh sách timeline.', 'error'))
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [statusFilter, ownerTypeFilter, isAdmin, showToast]
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    loadRef.current();
  }, [statusFilter, ownerTypeFilter]);

  useEffect(() => {
    const onLive = () => {
      loadRef.current({ silent: true });
    };
    window.addEventListener(TIMELINE_LIVE_EVENT, onLive);
    return () => window.removeEventListener(TIMELINE_LIVE_EVENT, onLive);
  }, []);

  useCloseOnClickOutside(filterRef, filterOpen, () => setFilterOpen(false));

  const activeFilterLabel = STATUS_FILTERS.find((f) => f.id === statusFilter)?.label || 'Chờ xử lý';

  const handleStatusSelect = (id) => {
    setStatusFilter(id);
    setFilterOpen(false);
  };

  const filtered = useMemo(() => {
    const q = (headerSearch.trim() || searchQuery.trim()).toLowerCase();
    if (!q) return timelines;
    return timelines.filter(
      (t) =>
        (t.clubName || '').toLowerCase().includes(q) ||
        (t.semesterLabel || '').toLowerCase().includes(q)
    );
  }, [timelines, searchQuery, headerSearch]);

  const pendingCount = useMemo(() => {
    return timelines.filter((t) => isTimelinePendingReview(t, isAdmin)).length;
  }, [timelines, isAdmin]);

  return (
    <div className="ctsv-events-page">
      {/* Hero */}
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">{isAdmin ? 'Admin · Timeline kỳ' : 'IC-PDP · Kế hoạch kỳ'}</span>
          <h1>{isAdmin ? 'Duyệt timeline kỳ học' : 'Duyệt timeline kỳ CLB'}</h1>
          <p>
            {isAdmin
              ? 'Timeline từ CLB, IC-PDP và CTSV — lọc theo đơn vị và trạng thái duyệt.'
              : 'CLB gửi kế hoạch hoạt động trước mỗi kỳ Spring / Summer / Fall. IC-PDP thẩm định, chuyển Admin phê duyệt cuối.'}
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">
              {statusFilter === 'all' ? 'Timeline' : 'Timeline (bộ lọc hiện tại)'}
            </span>
          </div>
          {!loading && pendingCount > 0 && (
            <p className="stl-pending-hint">
              {pendingCount} chờ {isAdmin ? 'Admin' : 'IC-PDP'} duyệt
            </p>
          )}
        </div>
      </header>

      {/* Filter card */}
      <section className="ctsv-events-filter-card">
        <div className="ctsv-events-filter-form" style={{ flexWrap: 'wrap', gap: 12 }}>
          <label className="ctsv-events-search" style={{ flex: '1 1 220px', maxWidth: 340 }}>
            <span className="ctsv-events-search-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" />
              </svg>
            </span>
            <input
              type="search"
              className="ctsv-events-search-input"
              placeholder="Tìm CLB, Spring/Summer/Fall..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <div className="stl-filter-dropdown" ref={filterRef}>
            <button
              type="button"
              className={`stl-filter-pill${filterOpen ? ' stl-filter-pill--open' : ''}`}
              onClick={() => setFilterOpen((open) => !open)}
              aria-expanded={filterOpen}
              aria-haspopup="listbox"
              aria-label="Lọc theo trạng thái timeline"
            >
              <span>{activeFilterLabel}</span>
              <svg className="stl-filter-caret" viewBox="0 0 10 6" width="10" height="6" fill="currentColor" aria-hidden>
                <path d="M0 0l5 6 5-6z" />
              </svg>
            </button>
            {filterOpen && (
              <div className="stl-filter-menu" role="listbox" aria-label="Trạng thái timeline">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.id || 'pending'}
                    type="button"
                    role="option"
                    aria-selected={statusFilter === f.id}
                    className={`stl-filter-menu-item${statusFilter === f.id ? ' stl-filter-menu-item--active' : ''}`}
                    onClick={() => handleStatusSelect(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isAdmin && (
            <div className="stl-filter-chips" role="group" aria-label="Lọc đơn vị">
              {ADMIN_OWNER_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`stl-filter-chip${ownerTypeFilter === f.id ? ' is-active' : ''}`}
                  onClick={() => setOwnerTypeFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {!loading && (
          <p className="ctsv-events-filter-summary">
            <strong>{filtered.length}</strong> timeline
          </p>
        )}
      </section>

      {/* Table card */}
      <section className="stl-card">
        <div className="stl-table-wrap">
          <table className="stl-table">
            <thead>
              <tr>
                <th>{isAdmin && ownerTypeFilter === 'all' ? 'Đơn vị' : 'CLB'}</th>
                <th>Kỳ học</th>
                <th className="col-center">Hoạt động</th>
                <th className="col-center">Bảng KH</th>
                <th className="col-center">Gửi lúc</th>
                <th className="col-center">Trạng thái</th>
                <th className="col-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="stl-row--skeleton">
                  <td><div className="stl-sk stl-sk--sm" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="stl-empty">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" aria-hidden>
                        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <p>Không có timeline nào.</p>
                      <p className="stl-empty-hint">{emptyTimelineHint(statusFilter, isAdmin)}</p>
                      {statusFilter !== 'all' && (
                        <button
                          type="button"
                          className="stl-empty-action-btn"
                          onClick={() => handleStatusSelect('all')}
                        >
                          Hiển thị tất cả
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((tl) => {
                const meta = resolveTimelineMeta(tl);
                const isPending = isTimelinePendingReview(tl, isAdmin);
                return (
                  <tr key={tl.id} className="stl-row">
                    <td>
                      <strong className="stl-club-name">{tl.ownerLabel || tl.clubName || '—'}</strong>
                      {tl.hasLocationConflict && (
                        <span className="stl-badge stl-badge--orange" style={{ marginLeft: 8 }}>Trùng địa điểm</span>
                      )}
                    </td>
                    <td className="stl-semester">{tl.semesterLabel || '—'}</td>
                    <td className="col-center stl-count">{tl.items?.length ?? 0}</td>
                    <td className="col-center">
                      {tl.hasEventPlan || tl.eventPlanFile || tl.eventPlanLink || tl.eventPlanFileName ? (
                        <span className="stl-badge stl-badge--green">Có file</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td className="col-center stl-date">{fmt(tl.submittedAt || tl.createdAt)}</td>
                    <td className="col-center">
                      <span className={`stl-badge stl-badge--${meta.tone}`}>{meta.label}</span>
                    </td>
                    <td className="col-center">
                      <Link
                        to={`${detailBase}/${tl.id}`}
                        className={`stl-action-btn${isPending ? ' stl-action-btn--primary' : ''}`}
                      >
                        {isPending ? 'Xét duyệt' : 'Xem chi tiết'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default IcpdpSemesterTimelineList;
