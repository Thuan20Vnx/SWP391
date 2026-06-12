import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchIcpdpSemesterTimelines } from '../../services/icpdpApi';
import { statusClass } from '../../utils/eventStatus';

const STATUS_FILTERS = [
  { id: '', label: 'Chờ xử lý' },
  { id: 'pending_icpdp', label: 'Chờ IC-PDP' },
  { id: 'pending_ctsv', label: 'Đã chuyển CTSV' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'revision', label: 'Cần chỉnh sửa' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'all', label: 'Tất cả' },
];

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const IcpdpSemesterTimelineList = () => {
  const { showToast } = useOutletContext() || {};
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return timelines;
    return timelines.filter(
      (t) =>
        (t.clubName || '').toLowerCase().includes(q) ||
        (t.semesterLabel || '').toLowerCase().includes(q)
    );
  }, [timelines, searchQuery]);

  const pendingCount = useMemo(
    () => timelines.filter((t) => t.statusKey === 'pending_icpdp').length,
    [timelines]
  );

  return (
    <div className="ctsv-events-page">
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">IC-PDP · Kế hoạch kỳ</span>
          <h1>Duyệt timeline kỳ CLB</h1>
          <p>
            CLB gửi kế hoạch hoạt động trước mỗi kỳ Spring / Summer / Fall. IC-PDP thẩm định trước khi chuyển CTSV phê duyệt cuối.
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">Timeline</span>
          </div>
          {!loading && pendingCount > 0 && (
            <p style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: 600, marginTop: 4 }}>
              {pendingCount} chờ IC-PDP duyệt
            </p>
          )}
        </div>
      </header>

      <div className="ctsv-events-toolbar">
        <input
          type="search"
          className="ctsv-events-search"
          placeholder="Tìm CLB, Spring/Summer/Fall..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="ctsv-events-filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={statusFilter === f.id ? 'ctsv-filter-chip active' : 'ctsv-filter-chip'}
              onClick={() => { setStatusFilter(f.id); load(f.id); }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ctsv-events-table-wrap">
        <table className="ctsv-events-table">
          <thead>
            <tr>
              <th>CLB</th>
              <th>Kỳ (Spring/Summer/Fall)</th>
              <th>Hoạt động</th>
              <th>Gửi lúc</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>Không có timeline nào.</td></tr>
            ) : (
              filtered.map((tl) => (
                <tr key={tl.id}>
                  <td><strong>{tl.clubName || '—'}</strong></td>
                  <td>{tl.semesterLabel}</td>
                  <td>{tl.items?.length || 0}</td>
                  <td>{formatDate(tl.submittedAt || tl.createdAt)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(tl.status, tl.statusKey)}`}>
                      {tl.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/icpdp/semester-timelines/${tl.id}`} className="ctsv-link-btn">
                      Xem chi tiết
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IcpdpSemesterTimelineList;
