import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchIcpdpProposals } from '../../services/icpdpApi';
import { statusClass } from '../../utils/eventStatus';

const STATUS_FILTERS = [
  { id: '', label: 'Tất cả' },
  { id: 'pending_icpdp', label: 'Chờ IC-PDP duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'revision', label: 'Cần chỉnh sửa' },
  { id: 'rejected', label: 'Từ chối' }
];

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconPin = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const IconTicket = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v1H3V9zm0 2h18v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-4z" />
  </svg>
);

const IcpdpProposalList = () => {
  const { showToast } = useOutletContext() || {};
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadProposals = useCallback(
    (overrideStatus) => {
      const status = overrideStatus ?? statusFilter;
      setLoading(true);
      const params = {};
      if (status) params.status = status;
      else params.includeClosed = '1';
      fetchIcpdpProposals(params)
        .then((d) => setProposals(d.proposals || []))
        .catch((err) => {
          if (err.status === 401 || err.status === 403) return;
          showToast?.('Không tải được danh sách đề xuất.', 'error');
        })
        .finally(() => setLoading(false));
    },
    [statusFilter, showToast]
  );

  useEffect(() => {
    loadProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return proposals;
    return proposals.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.clubName || '').toLowerCase().includes(q)
    );
  }, [proposals, searchQuery]);

  const handleStatusChange = (id) => {
    setStatusFilter(id);
    loadProposals(id);
  };

  const pendingCount = useMemo(
    () => proposals.filter((p) => p.statusKey === 'pending_icpdp').length,
    [proposals]
  );

  return (
    <div className="ctsv-events-page icpdp-list-page icpdp-proposal-list-page">
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">Quản lý đề xuất IC-PDP</span>
          <h1>Duyệt đề xuất sự kiện CLB</h1>
          <p>
            Xét duyệt nội bộ các đề xuất từ Ban chủ nhiệm CLB. Sau khi IC-PDP duyệt, đề xuất chuyển sang CTSV phê duyệt cuối.
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">Đề xuất</span>
          </div>
          {!loading && pendingCount > 0 && (
            <p style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>
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
            placeholder="Tìm theo tên đề xuất, CLB…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm đề xuất"
          />
        </div>
        <div className="icpdp-status-filters" role="group" aria-label="Lọc trạng thái">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`icpdp-status-chip ${statusFilter === f.id ? 'is-active' : ''}`}
              onClick={() => handleStatusChange(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="icpdp-proposals-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="icpdp-proposal-card" style={{ minHeight: 160 }}>
              <div className="sk sk-line sk-line--lg" />
              <div className="sk sk-line" />
              <div className="sk sk-line sk-line--short" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ctsv-events-empty">
          <span className="ctsv-events-empty-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <h2>Không có đề xuất nào</h2>
          <p>Thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
          <button type="button" className="ctsv-events-filter-btn" onClick={() => { setStatusFilter(''); loadProposals(''); }}>
            Xem tất cả
          </button>
        </div>
      ) : (
        <div className="icpdp-proposals-grid">
          {filtered.map((p) => {
            const isPendingIcpdp = p.statusKey === 'pending_icpdp';
            return (
              <article key={p.id} className="icpdp-proposal-card">
                <div className="icpdp-proposal-card__header">
                  <div>
                    <h3 className="icpdp-proposal-card__title">{p.title}</h3>
                    <p className="icpdp-proposal-card__club">{p.clubName || 'Chưa xác định CLB'}</p>
                  </div>
                  <span className={`status-pill ${statusClass(p.status, p.statusKey)}`}>{p.status}</span>
                </div>
                <div className="icpdp-proposal-card__meta">
                  <span><IconCalendar /> {p.date} {p.time}</span>
                  {p.location && <span><IconPin /> {p.location}</span>}
                  {p.totalTickets > 0 && <span><IconTicket /> {p.totalTickets} vé</span>}
                </div>
                <div className="icpdp-proposal-card__footer">
                  {p.icpdpNote && (
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                      Ghi chú: {p.icpdpNote.slice(0, 50)}{p.icpdpNote.length > 50 ? '…' : ''}
                    </span>
                  )}
                  <Link
                    to={`/icpdp/proposals/${p.id}`}
                    className={`icpdp-proposal-card__action ${isPendingIcpdp ? 'icpdp-proposal-card__action--primary' : 'icpdp-proposal-card__action--ghost'}`}
                  >
                    {isPendingIcpdp ? 'Duyệt ngay' : 'Xem chi tiết'}
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

export default IcpdpProposalList;
