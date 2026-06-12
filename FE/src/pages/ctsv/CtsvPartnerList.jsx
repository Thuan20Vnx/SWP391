import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
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

const CtsvPartnerList = () => {
  const { showToast } = useOutletContext() || {};
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    return fetchCtsvPartners(params)
      .then((d) => setPartners(d.partners || []))
      .catch(() => showToast?.('Không tải danh sách đơn đăng ký.', 'error'))
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
    if (!partners.length) return 'Hiển thị 0-0 trong 0 đơn';
    const from = (pageSafe - 1) * PAGE_SIZE + 1;
    const to = Math.min(pageSafe * PAGE_SIZE, partners.length);
    return `Hiển thị ${from}-${to} trong ${partners.length} đơn`;
  }, [partners.length, pageSafe]);

  return (
    <div className="ctsv-partners-page">
      <header className="ctsv-partners-head">
        <h1 className="ctsv-partners-title">Duyệt đơn đăng ký đối tác</h1>
        <p className="ctsv-partners-sub">
          Đối tác gửi đơn qua cổng đối tác; CTSV xem hồ sơ, phê duyệt hoặc từ chối tại đây.
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
                placeholder="Tìm theo tên, email..."
                aria-label="Tìm đơn đăng ký"
              />
            </label>
            <div className="ctsv-partners-filter">
              <AppSelect
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc trạng thái đơn"
                fullWidth={false}
                options={FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
          </div>
        </div>

        <div className="ctsv-partners-table-wrap">
          <table className="ctsv-partners-table">
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
                <tr>
                  <td colSpan={5} className="ctsv-partners-empty">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!loading && slice.length === 0 && (
                <tr>
                  <td colSpan={5} className="ctsv-partners-empty">
                    Không có đơn đăng ký phù hợp.
                  </td>
                </tr>
              )}
              {!loading &&
                slice.map((p) => {
                  const tone = PARTNER_STATUS_TONE[p.status] || 'slate';
                  const program = p.proposedProgram || p.proposedEventTitle || '—';
                  const code = p.partnerCode || p.email?.split('@')[0] || '—';
                  const actionLabel = ['pending', 'info_requested'].includes(p.status) ? 'Xét duyệt' : 'Xem đơn';

                  return (
                    <tr key={p._id}>
                      <td data-label="Đơn vị gửi">
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
                      <td className="ctsv-partners-program" data-label="Nội dung đề xuất">
                        {program}
                      </td>
                      <td className="col-center ctsv-partners-date" data-label="Ngày gửi">
                        {formatPartnerDate(p.createdAt)}
                      </td>
                      <td className="col-center" data-label="Trạng thái">
                        <span className={`ctsv-partners-badge ctsv-partners-badge--${tone}`}>
                          {PARTNER_STATUS_LABEL[p.status] || p.status}
                        </span>
                      </td>
                      <td className="col-center" data-label="Thao tác">
                        <Link to={`/ctsv/partners/${p._id}`} className="ctsv-partners-detail-btn">
                          {actionLabel}
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
