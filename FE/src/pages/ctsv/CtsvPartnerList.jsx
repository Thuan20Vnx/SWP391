import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchCtsvPartners } from '../../services/ctsvApi';
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_TONE,
  formatPartnerDate,
  partnerInitials
} from '../../utils/partnerDisplay';

const PAGE_SIZE = 8;
const FILTER_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' }
];

const CtsvPartnerList = () => {
  const { showToast } = useOutletContext() || {};
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    return fetchCtsvPartners(params)
      .then((d) => setPartners(d.partners || []))
      .catch(() => showToast?.('Không tải danh sách đối tác.', 'error'))
      .finally(() => setLoading(false));
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, search ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const totalPages = Math.max(1, Math.ceil(partners.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return partners.slice(start, start + PAGE_SIZE);
  }, [partners, pageSafe]);

  const rangeLabel = useMemo(() => {
    if (!partners.length) return 'Hiển thị 0–0 trong 0 đối tác';
    const from = (pageSafe - 1) * PAGE_SIZE + 1;
    const to = Math.min(pageSafe * PAGE_SIZE, partners.length);
    return `Hiển thị ${from}–${to} trong ${partners.length} đối tác`;
  }, [partners.length, pageSafe]);

  return (
    <div className="ctsv-partners-page">
      <header className="ctsv-partners-head">
        <h1 className="ctsv-partners-title">Quản lý đối tác tài trợ</h1>
        <p className="ctsv-partners-sub">
          Quản lý các đề xuất tài trợ, theo dõi trạng thái và thông tin đối tác.
        </p>
      </header>

      <section className="ctsv-partners-card" aria-busy={loading}>
        <div className="ctsv-partners-toolbar">
          <div className="ctsv-partners-toolbar-left">
            <label className="ctsv-partners-search">
              <span className="ctsv-partners-search-icon" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20L17 17" />
                </svg>
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm đối tác..."
                aria-label="Tìm đối tác"
              />
            </label>
            <div className="ctsv-partners-filter">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc trạng thái"
              >
                {FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="ctsv-partners-filter-chevron" aria-hidden>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </span>
            </div>
          </div>
          <Link to="/ctsv/partners/new" className="ctsv-partners-add-btn">
            <span aria-hidden>+</span>
            Thêm đối tác
          </Link>
        </div>

        <div className="ctsv-partners-table-wrap">
          <table className="ctsv-partners-table">
            <thead>
              <tr>
                <th>Đối tác</th>
                <th>Chương trình đề xuất</th>
                <th className="col-center">Ngày gửi</th>
                <th className="col-center">Trạng thái</th>
                <th className="col-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="ctsv-partners-empty">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!loading && slice.length === 0 && (
                <tr>
                  <td colSpan={5} className="ctsv-partners-empty">
                    Không có đối tác phù hợp.
                  </td>
                </tr>
              )}
              {!loading &&
                slice.map((p) => {
                  const tone = PARTNER_STATUS_TONE[p.status] || 'slate';
                  const program = p.proposedProgram || p.proposedEventTitle || '—';
                  const code = p.partnerCode || p.email?.split('@')[0] || '—';
                  return (
                    <tr key={p._id}>
                      <td>
                        <div className="ctsv-partners-partner-cell">
                          <span className="ctsv-partners-avatar" aria-hidden>
                            {partnerInitials(p.name)}
                          </span>
                          <span>
                            <span className="ctsv-partners-name">{p.name}</span>
                            <span className="ctsv-partners-code">{code}</span>
                          </span>
                        </div>
                      </td>
                      <td className="ctsv-partners-program">{program}</td>
                      <td className="col-center ctsv-partners-date">
                        {formatPartnerDate(p.createdAt)}
                      </td>
                      <td className="col-center">
                        <span className={`ctsv-partners-badge ctsv-partners-badge--${tone}`}>
                          {PARTNER_STATUS_LABEL[p.status] || p.status}
                        </span>
                      </td>
                      <td className="col-center">
                        <Link to={`/ctsv/partners/${p._id}`} className="ctsv-partners-detail-btn">
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <footer className="ctsv-partners-pagination">
          <span>{rangeLabel}</span>
          <div className="ctsv-partners-pager">
            <button
              type="button"
              className="ctsv-partners-pager-btn"
              disabled={pageSafe <= 1}
              onClick={() => setPage((n) => Math.max(1, n - 1))}
              aria-label="Trang trước"
            >
              ‹
            </button>
            <span className="ctsv-partners-pager-num">{pageSafe}</span>
            <button
              type="button"
              className="ctsv-partners-pager-btn"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
              aria-label="Trang sau"
            >
              ›
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default CtsvPartnerList;
