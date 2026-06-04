import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminFptNotifBell from '../../../components/admin/AdminFptNotifBell';
import PublicAdminShell from '../../../layouts/PublicAdminShell';
import SiteFooter from '../../../components/SiteFooter';
import { fetchAdminAccounts } from '../../../services/adminApi';
import { buildDepartmentUnits, FPT_TYPE_META } from '../../../data/adminFptSystemData';
import { getAccountInitials } from '../../../data/adminAccountsData';
import '../../../styles/admin-public-pages.css';

const ROLE_LABELS = {
  ctsv: 'Phòng Công tác Sinh viên (CTSV)',
  icpdp: 'IC-PDP · Chương trình Quốc tế',
};

const AdminFptDeptDetail = ({ showToast }) => {
  const { deptType } = useParams();
  const navigate = useNavigate();
  const unit = buildDepartmentUnits().find((d) => d.type === deptType);
  const meta = FPT_TYPE_META[deptType] || FPT_TYPE_META.ctsv;

  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unit?.accountsRole) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAdminAccounts({ page: 1, limit: 20, role: unit.accountsRole, search: '' })
      .then((res) => {
        setAccounts(res.accounts || []);
        setTotal(res.total ?? res.accounts?.length ?? 0);
      })
      .catch(() => showToast?.('Không tải được danh sách tài khoản.', 'error'))
      .finally(() => setLoading(false));
  }, [unit?.accountsRole, showToast]);

  if (!unit) {
    return (
      <PublicAdminShell activeNav="home">
        <div className="admin-fpt-dept-detail">
          <p>Không tìm thấy đơn vị.</p>
          <Link to="/">← Quay lại</Link>
        </div>
        <SiteFooter />
      </PublicAdminShell>
    );
  }

  return (
    <PublicAdminShell activeNav="home">
      <div className="admin-fpt-system home-layout">
        <main className="admin-fpt-dept-detail">
          <Link to="/" className="admin-partner-detail__back">
            ← Quay lại Hệ thống FPT
          </Link>

          <div className="admin-fpt-dept-detail__hero">
            <div className="admin-fpt-dept-detail__cover-wrap">
              <img src={unit.coverImage} alt="" className="admin-fpt-dept-detail__cover" />
              <span className={`admin-fpt-unit-card__badge ${meta.badgeClass}`}>{meta.label}</span>
            </div>
            <div className="admin-fpt-dept-detail__intro">
              <span className="admin-fpt-dept-detail__role">{ROLE_LABELS[deptType] || unit.subtitle}</span>
              <h1>{unit.name}</h1>
              <p>{unit.description}</p>
              <div className="admin-fpt-dept-detail__hero-actions">
                <button
                  type="button"
                  className="admin-fpt-dept-card__btn admin-fpt-dept-card__btn--primary"
                  onClick={() => navigate(unit.manageLink)}
                >
                  {unit.manageLabel}
                </button>
                <button
                  type="button"
                  className="admin-fpt-dept-card__btn admin-fpt-dept-card__btn--ghost"
                  onClick={() => navigate('/admin/announcements')}
                >
                  Gửi thông báo
                </button>
                <AdminFptNotifBell className="admin-fpt-notif-bell--inline" />
              </div>
            </div>
          </div>

          <section className="admin-fpt-dept-detail__accounts">
            <header>
              <h2>Tài khoản {meta.label}</h2>
              <p>
                {loading ? 'Đang tải...' : `${total} tài khoản trong hệ thống`}
              </p>
            </header>

            {loading ? (
              <p className="admin-partner-detail__muted">Đang tải danh sách...</p>
            ) : accounts.length === 0 ? (
              <p className="admin-partner-detail__muted">Chưa có tài khoản {meta.label}.</p>
            ) : (
              <ul className="admin-fpt-dept-detail__account-list">
                {accounts.map((acc) => (
                  <li key={acc._id || acc.id}>
                    <span className="admin-fpt-dept-detail__avatar">
                      {getAccountInitials(acc.fullname || acc.email)}
                    </span>
                    <div>
                      <strong>{acc.fullname || acc.email}</strong>
                      <span>{acc.email}</span>
                      {acc.mssv && <span>MSSV: {acc.mssv}</span>}
                    </div>
                    <span
                      className={`admin-fpt-dept-detail__status${
                        acc.isActive !== false ? ' is-active' : ''
                      }`}
                    >
                      {acc.isActive !== false ? 'Hoạt động' : 'Tạm khóa'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="admin-fpt-dept-detail__manage-link"
              onClick={() => navigate(`/admin/accounts?role=${unit.accountsRole}`)}
            >
              Quản lý tất cả tài khoản {meta.label} →
            </button>
          </section>
        </main>
        <SiteFooter />
      </div>
    </PublicAdminShell>
  );
};

export default AdminFptDeptDetail;
