import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ApprovalListPagination from '../../components/approval/ApprovalListPagination';
import { fetchAdminPartners } from '../../services/adminApi';
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_TONE,
  formatPartnerDate,
  partnerInitials,
} from '../../utils/partnerDisplay';
import { useTranslation } from '../../i18n/I18nContext';
import '../../styles/admin-dashboard.css';

const PAGE_SIZE = 6;

const AVATAR_COLORS = [
  ['#ea580c', '#f97316'],
  ['#1e293b', '#334155'],
  ['#0369a1', '#0ea5e9'],
  ['#0f766e', '#14b8a6'],
  ['#b45309', '#d97706'],
  ['#3730a3', '#6366f1'],
];

const avatarGradient = (name = '') => {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const [from, to] = AVATAR_COLORS[idx];
  return `linear-gradient(145deg, ${from}, ${to})`;
};

const StatCard = ({ label, value, tone }) => (
  <div className={`cplist-stat cplist-stat--${tone}`}>
    <span className="cplist-stat__value">{value}</span>
    <span className="cplist-stat__label">{label}</span>
  </div>
);

const AdminPartnerApprovals = ({ showToast }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const userRole = localStorage.getItem('userRole');

  const load = useCallback(() => {
    setLoading(true);
    return fetchAdminPartners('pending_admin')
      .then((d) => setPartners(d.partners || []))
      .catch((e) => showToast?.(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    if (userRole !== 'admin') {
      showToast?.(t('admin.common.adminOnly'), 'error');
      navigate('/profile');
      return;
    }
    load();
  }, [userRole, navigate, showToast, t, load]);

  const totalPages = Math.max(1, Math.ceil(partners.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return partners.slice(start, start + PAGE_SIZE);
  }, [partners, pageSafe]);

  return (
    <div className="cplist-page">
      <header className="cplist-hero">
        <div className="cplist-hero__text">
          <span className="cplist-hero__eyebrow">{t('admin.partnerApprovals.title')}</span>
          <h1 className="cplist-hero__title">{t('admin.partnerApprovals.title')}</h1>
          <p className="cplist-hero__desc">{t('admin.partnerApprovals.subtitle')}</p>
        </div>
        <div className="cplist-hero__aside">
          <div className="cplist-hero__stat" aria-live="polite">
            <span className="cplist-hero__stat-num">{loading ? '—' : partners.length}</span>
            <span className="cplist-hero__stat-label">Đơn chờ Admin</span>
          </div>
        </div>
      </header>

      {!loading && (
        <div className="cplist-stats-row">
          <StatCard label="Chờ Admin duyệt" value={partners.length} tone="pending" />
        </div>
      )}

      <section className="cplist-card" aria-busy={loading}>
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
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="cplist-row--skeleton">
                    <td><div className="cplist-skeleton cplist-skeleton--row" /></td>
                    <td><div className="cplist-skeleton" /></td>
                    <td><div className="cplist-skeleton cplist-skeleton--sm" /></td>
                    <td><div className="cplist-skeleton cplist-skeleton--sm" /></td>
                    <td><div className="cplist-skeleton cplist-skeleton--sm" /></td>
                  </tr>
                ))}
              {!loading && slice.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="cplist-empty">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" aria-hidden>
                        <rect x="2" y="7" width="20" height="15" rx="2" />
                        <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 1 4 0" />
                        <path d="M12 12v4M10 14h4" />
                      </svg>
                      <p>{t('admin.partnerApprovals.empty')}</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                slice.map((p) => {
                  const tone = PARTNER_STATUS_TONE[p.status] || 'slate';
                  const program = p.proposedProgram || p.proposedEventTitle || '—';
                  const code = p.partnerCode || p.email?.split('@')[0] || '—';
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
                        <Link to={`/partners/${p._id}`} className="cplist-action-btn cplist-action-btn--primary">
                          Xét duyệt
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="cplist-footer">
          <ApprovalListPagination
            page={pageSafe}
            totalItems={partners.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      </section>
    </div>
  );
};

export default AdminPartnerApprovals;
