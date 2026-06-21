import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { isAdminRole } from '../../utils/auth';
import AppSelect from '../../components/ui/AppSelect';
import { fetchCtsvPartners } from '../../services/ctsvApi';
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_TONE,
  formatPartnerDate,
  partnerInitials
} from '../../utils/partnerDisplay';

const PAGE_SIZE = 8;

const FILTER_OPTIONS = [
  { value: '', label: 'Tất cả đơn' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'info_requested', label: 'Cần bổ sung' },
  { value: 'pending_admin', label: 'Chờ Admin' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' }
];

const AVATAR_COLORS = [
  ['#ea580c', '#f97316'],
  ['#1e293b', '#334155'],
  ['#0369a1', '#0ea5e9'],
  ['#0f766e', '#14b8a6'],
  ['#b45309', '#d97706'],
  ['#3730a3', '#6366f1'],
];

const avatarGradient = (name = '') => {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  const [from, to] = AVATAR_COLORS[idx];
  return `linear-gradient(145deg, ${from}, ${to})`;
};

const StatCard = ({ label, value, tone }) => (
  <div className={`cplist-stat cplist-stat--${tone}`}>
    <span className="cplist-stat__value">{value}</span>
    <span className="cplist-stat__label">{label}</span>
  </div>
);

const CtsvPartnerList = () => {
  const { showToast, headerSearch = '' } = useOutletContext() || {};
  const basePath = isAdminRole() ? '/admin/ctsv' : '/ctsv';
  const [allPartners, setAllPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);

  // Ưu tiên từ khóa gõ trên header, fallback ô tìm kiếm trong trang
  const effectiveSearch = headerSearch.trim() || search.trim();

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (effectiveSearch) params.search = effectiveSearch;
    return fetchCtsvPartners(params)
      .then((d) => setAllPartners(d.partners || []))
      .catch(() => showToast?.('Không tải danh sách đơn đăng ký.', 'error'))
      .finally(() => setLoading(false));
  }, [effectiveSearch, showToast]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, effectiveSearch ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, effectiveSearch]);

  const filteredPartners = useMemo(() => {
    if (!statusFilter) return allPartners;
    return allPartners.filter((p) => p.status === statusFilter);
  }, [allPartners, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);

  const slice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filteredPartners.slice(start, start + PAGE_SIZE);
  }, [filteredPartners, pageSafe]);

  const stats = useMemo(() => ({
    total: allPartners.length,
    pending: allPartners.filter((p) => p.status === 'pending').length,
    approved: allPartners.filter((p) => p.status === 'approved').length,
    rejected: allPartners.filter((p) => p.status === 'rejected').length,
  }), [allPartners]);

  const rangeLabel = useMemo(() => {
    if (!filteredPartners.length) return 'Không có đơn nào';
    const from = (pageSafe - 1) * PAGE_SIZE + 1;
    const to = Math.min(pageSafe * PAGE_SIZE, filteredPartners.length);
    return `${from}–${to} trong ${filteredPartners.length} đơn`;
  }, [filteredPartners.length, pageSafe]);

  return (
    <div className="cplist-page">
      {/* Hero */}
      <header className="cplist-hero">
        <div className="cplist-hero__text">
          <span className="cplist-hero__eyebrow">Quản lý đối tác</span>
          <h1 className="cplist-hero__title">Duyệt đơn đăng ký đối tác</h1>
          <p className="cplist-hero__desc">
            Đối tác gửi đơn qua cổng đối tác. CTSV xem hồ sơ, phê duyệt hoặc yêu cầu bổ sung tại đây.
          </p>
        </div>
        <div className="cplist-hero__aside">
          <div className="cplist-hero__stat" aria-live="polite">
            <span className="cplist-hero__stat-num">{loading ? '—' : partners.length}</span>
            <span className="cplist-hero__stat-label">Đơn trong danh sách</span>
          </div>
        </div>
      </header>

      {/* Stats row */}
      {!loading && (
        <div className="cplist-stats-row">
          <StatCard label="Tất cả" value={stats.total} tone="total" />
          <StatCard label="Chờ duyệt" value={stats.pending} tone="pending" />
          <StatCard label="Đã duyệt" value={stats.approved} tone="approved" />
          <StatCard label="Từ chối" value={stats.rejected} tone="rejected" />
        </div>
      )}

      {/* Table card */}
      <section className="cplist-card" aria-busy={loading}>
        {/* Toolbar */}
        <div className="cplist-toolbar">
          <label className="cplist-search">
            <svg className="cplist-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="M20 20L17 17" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email..."
              aria-label="Tìm đơn đăng ký"
              className="cplist-search__input"
            />
          </label>
          <div className="cplist-filter-wrap">
            <AppSelect
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              aria-label="Lọc trạng thái"
              fullWidth={false}
              options={FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
        </div>

        {/* Table */}
        <div className="cplist-table-wrap">
          <table className="cplist-table">
            <thead>
              <tr>
                <th>Đơn vị gửi</th>
                <th>Nội dung đề xuất</th>
                <th className="col-center">Ngày gửi</th>
                <th className="col-center">Trạng thái</th>
                <th className="col-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="cplist-row--skeleton">
                    <td><div className="cplist-skeleton cplist-skeleton--row" /></td>
                    <td><div className="cplist-skeleton" /></td>
                    <td><div className="cplist-skeleton cplist-skeleton--sm" /></td>
                    <td><div className="cplist-skeleton cplist-skeleton--sm" /></td>
                    <td><div className="cplist-skeleton cplist-skeleton--sm" /></td>
                  </tr>
                ))
              )}
              {!loading && slice.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="cplist-empty">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" aria-hidden>
                        <rect x="2" y="7" width="20" height="15" rx="2" />
                        <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 1 4 0" />
                        <path d="M12 12v4M10 14h4" />
                      </svg>
                      <p>Không có đơn đăng ký phù hợp</p>
                      <button type="button" className="cplist-empty__reset" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>
                        Xem tất cả
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && slice.map((p) => {
                const tone = PARTNER_STATUS_TONE[p.status] || 'slate';
                const program = p.proposedProgram || p.proposedEventTitle || '—';
                const code = p.partnerCode || p.email?.split('@')[0] || '—';
                const actionLabel = ['pending', 'info_requested'].includes(p.status) ? 'Xét duyệt' : 'Xem đơn';
                const isPrimary = ['pending', 'info_requested'].includes(p.status);

                return (
                  <tr key={p._id} className="cplist-row">
                    <td data-label="Đơn vị gửi">
                      <div className="cplist-partner-cell">
                        <span className="cplist-avatar" style={{ background: avatarGradient(p.name) }} aria-hidden>
                          {partnerInitials(p.name)}
                        </span>
                        <span className="cplist-partner-info">
                          <span className="cplist-partner-name">{p.name}</span>
                          <span className="cplist-partner-code">{code}</span>
                        </span>
                      </div>
                    </td>
                    <td className="cplist-program" data-label="Nội dung đề xuất">{program}</td>
                    <td className="col-center cplist-date" data-label="Ngày gửi">{formatPartnerDate(p.createdAt)}</td>
                    <td className="col-center" data-label="Trạng thái">
                      <span className={`cplist-badge cplist-badge--${tone}`}>
                        {PARTNER_STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                    <td className="col-center" data-label="Thao tác">
                      <Link
                        to={`${basePath}/partners/${p._id}`}
                        className={`cplist-action-btn${isPrimary ? ' cplist-action-btn--primary' : ''}`}
                      >
                        {actionLabel}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="cplist-footer">
          <span className="cplist-range">{rangeLabel}</span>
          {totalPages > 1 && (
            <div className="ctsv-section-pager">
              <button type="button" className="ctsv-pager-btn" disabled={pageSafe <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))}>
                Trước
              </button>
              <span className="ctsv-pager-label">Trang {pageSafe} / {totalPages}</span>
              <button type="button" className="ctsv-pager-btn" disabled={pageSafe >= totalPages} onClick={() => setPage((n) => Math.min(totalPages, n + 1))}>
                Sau
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CtsvPartnerList;
