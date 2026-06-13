import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { fetchClubRegistrations } from '../../services/adminApi';
import { statusClass } from '../../utils/eventStatus';

const STATUS_FILTERS = [
  { id: '', label: 'Chờ xử lý' },
  { id: 'pending_icpdp', label: 'Chờ IC-PDP' },
  { id: 'revision', label: 'Cần chỉnh sửa' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'all', label: 'Tất cả' },
];

const resolveBasePath = (pathname) =>
  pathname.startsWith('/admin') ? '/admin/icpdp/club-registrations' : '/icpdp/club-registrations';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const IcpdpClubRegistrationList = () => {
  const { showToast } = useOutletContext() || {};
  const { pathname } = useLocation();
  const basePath = resolveBasePath(pathname);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(
    (overrideStatus) => {
      const status = overrideStatus ?? statusFilter;
      setLoading(true);
      const params = {};
      if (status) params.status = status;
      fetchClubRegistrations(params)
        .then((d) => setRegistrations(d.registrations || []))
        .catch((err) => {
          if (err.status === 401 || err.status === 403) return;
          showToast?.('Không tải được danh sách đơn CLB.', 'error');
        })
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
    if (!q) return registrations;
    return registrations.filter(
      (r) =>
        (r.clubName || '').toLowerCase().includes(q) ||
        (r.president || '').toLowerCase().includes(q) ||
        (r.presidentEmail || '').toLowerCase().includes(q)
    );
  }, [registrations, searchQuery]);

  const pendingCount = useMemo(
    () => registrations.filter((r) => r.statusKey === 'pending_icpdp').length,
    [registrations]
  );

  const handleStatusChange = (id) => {
    setStatusFilter(id);
    load(id);
  };

  const pageClass = pathname.startsWith('/admin')
    ? 'ctsv-events-page icpdp-list-page icpdp-club-registration-list-page admin-icpdp-club-reg-page'
    : 'ctsv-events-page icpdp-list-page icpdp-club-registration-list-page';

  return (
    <div className={pageClass}>
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">IC-PDP · Thành lập CLB</span>
          <h1>Duyệt đăng ký CLB mới</h1>
          <p>
            Tiếp nhận và phê duyệt các đơn thành lập câu lạc bộ mới. Sau khi duyệt, hệ thống tự tạo CLB và
            gán quyền quản lý cho chủ nhiệm đề xuất.
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">Đơn đăng ký</span>
          </div>
          {!loading && pendingCount > 0 && (
            <p style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: 600, marginTop: 4 }}>
              {pendingCount} chờ IC-PDP duyệt
            </p>
          )}
        </div>
      </header>

      <section className="icpdp-proposals-toolbar">
        <div className="icpdp-proposals-search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            type="search"
            placeholder="Tìm theo tên CLB, chủ nhiệm, email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm đơn CLB"
          />
        </div>
        <div className="icpdp-status-filters" role="group" aria-label="Lọc trạng thái">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id || 'default'}
              type="button"
              className={`icpdp-status-chip ${statusFilter === f.id ? 'is-active' : ''}`}
              onClick={() => handleStatusChange(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {loading && registrations.length === 0 ? (
        <div className="icpdp-proposals-grid" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="icpdp-proposal-card" style={{ minHeight: 140 }}>
              <div className="sk sk-line sk-line--lg" />
              <div className="sk sk-line" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ctsv-events-empty">
          <h2>Không có đơn nào</h2>
          <p>
            {statusFilter === 'approved' || statusFilter === 'rejected'
              ? 'Chưa có đơn ở trạng thái này — thử «Chờ xử lý» hoặc «Tất cả».'
              : 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'}
          </p>
        </div>
      ) : (
        <div className="icpdp-proposals-grid" style={{ opacity: loading ? 0.55 : 1 }}>
          {filtered.map((r) => {
            const isPending = r.statusKey === 'pending_icpdp';
            return (
              <article key={r.id} className="icpdp-proposal-card icpdp-club-reg-card">
                <div className="icpdp-proposal-card__header">
                  <div>
                    <h3 className="icpdp-proposal-card__title">{r.clubName}</h3>
                    <p className="icpdp-proposal-card__club">
                      {r.category} · Chủ nhiệm: {r.president}
                    </p>
                  </div>
                  <span className={`status-pill ${statusClass(r.status, r.statusKey)}`}>{r.status}</span>
                </div>
                <p className="icpdp-club-reg-card__desc">
                  {(r.description || '').slice(0, 120)}
                  {(r.description || '').length > 120 ? '…' : ''}
                </p>
                <div className="icpdp-proposal-card__meta">
                  <span>{r.presidentEmail}</span>
                  <span>Gửi: {formatDate(r.createdAt)}</span>
                </div>
                <div className="icpdp-proposal-card__footer">
                  <Link
                    to={`${basePath}/${r.id}`}
                    className={`icpdp-proposal-card__action ${isPending ? 'icpdp-proposal-card__action--primary' : 'icpdp-proposal-card__action--ghost'}`}
                  >
                    {isPending ? 'Duyệt ngay' : 'Xem chi tiết'}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IcpdpClubRegistrationList;
