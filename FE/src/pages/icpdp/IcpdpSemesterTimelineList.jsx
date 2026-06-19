import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchIcpdpSemesterTimelines } from '../../services/icpdpApi';
import { getUserRole } from '../../utils/auth';

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
};

const fmt = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const IcpdpSemesterTimelineList = () => {
  const { showToast } = useOutletContext() || {};

  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';
  const detailBase = isAdmin ? '/admin/semester-timelines' : '/icpdp/semester-timelines';
  const STATUS_FILTERS = isAdmin ? ADMIN_STATUS_FILTERS : ICPDP_STATUS_FILTERS;

  const [statusFilter, setStatusFilter] = useState(isAdmin ? 'pending_admin' : '');
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(
    (overrideStatus) => {
      const status = overrideStatus ?? statusFilter;
      setLoading(true);
      const params = {};
      if (status) params.status = status;
      fetchIcpdpSemesterTimelines(params)
        .then((d) => setTimelines(d.timelines || []))
        .catch(() => showToast?.('Không tải được danh sách timeline.', 'error'))
        .finally(() => setLoading(false));
    },
    [statusFilter, showToast]
  );

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return timelines;
    return timelines.filter(
      (t) =>
        (t.clubName || '').toLowerCase().includes(q) ||
        (t.semesterLabel || '').toLowerCase().includes(q)
    );
  }, [timelines, searchQuery]);

  const pendingCount = useMemo(() => {
    const ps = isAdmin ? 'pending_admin' : 'pending_icpdp';
    return timelines.filter((t) => t.statusKey === ps).length;
  }, [timelines, isAdmin]);

  return (
    <div className="ctsv-events-page">
      {/* Hero */}
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">IC-PDP · Kế hoạch kỳ</span>
          <h1>Duyệt timeline kỳ CLB</h1>
          <p>CLB gửi kế hoạch hoạt động trước mỗi kỳ Spring / Summer / Fall. IC-PDP thẩm định, chuyển Admin phê duyệt cuối.</p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">Timeline</span>
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
          <div className="stl-chip-row">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`stl-chip${statusFilter === f.id ? ' stl-chip--active' : ''}`}
                onClick={() => { setStatusFilter(f.id); load(f.id); }}
              >
                {f.label}
              </button>
            ))}
          </div>
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
                <th>CLB</th>
                <th>Kỳ học</th>
                <th className="col-center">Hoạt động</th>
                <th className="col-center">Gửi lúc</th>
                <th className="col-center">Trạng thái</th>
                <th className="col-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="stl-row--skeleton">
                  <td><div className="stl-sk stl-sk--wide" /></td>
                  <td><div className="stl-sk" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                  <td><div className="stl-sk stl-sk--sm" /></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="stl-empty">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" aria-hidden>
                        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <p>Không có timeline nào.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((tl) => {
                const meta = STATUS_META[tl.statusKey] || { label: tl.status || '—', tone: 'slate' };
                const isPending = tl.statusKey === 'pending_icpdp' || tl.statusKey === 'pending_admin';
                return (
                  <tr key={tl.id} className="stl-row">
                    <td><strong className="stl-club-name">{tl.clubName || '—'}</strong></td>
                    <td className="stl-semester">{tl.semesterLabel || '—'}</td>
                    <td className="col-center stl-count">{tl.items?.length ?? 0}</td>
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
