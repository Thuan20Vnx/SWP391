import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminFptNotifBell from '../../../components/admin/AdminFptNotifBell';
import PublicAdminShell from '../../../layouts/PublicAdminShell';
import SiteFooter from '../../../components/SiteFooter';
import { fetchAdminAccounts, fetchClubRegistrations } from '../../../services/adminApi';
import {
  buildDepartmentUnits,
  localizeDepartmentUnit,
  resolveFptTypeLabel,
} from '../../../data/adminFptSystemData';
import { getAccountInitials } from '../../../data/adminAccountsData';
import { useTranslation } from '../../../i18n/I18nContext';
import '../../../styles/admin-public-pages.css';

const AdminFptDeptDetail = ({ showToast }) => {
  const { deptType } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const rawUnit = buildDepartmentUnits().find((d) => d.type === deptType);
  const unit = useMemo(
    () => (rawUnit ? localizeDepartmentUnit(rawUnit, t) : null),
    [rawUnit, t],
  );
  const typeLabel = resolveFptTypeLabel(deptType, t);

  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clubRegistrations, setClubRegistrations] = useState([]);
  const [clubRegsLoading, setClubRegsLoading] = useState(false);
  const isIcpdpDept = deptType === 'icpdp';
  const clubRegListPath = unit?.clubRegistrationLink || '/admin/icpdp/club-registrations';

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
      .catch(() => showToast?.(t('admin.fpt.dept.loadAccountsFail'), 'error'))
      .finally(() => setLoading(false));
  }, [unit?.accountsRole, showToast, t]);

  useEffect(() => {
    if (!isIcpdpDept) return;
    setClubRegsLoading(true);
    fetchClubRegistrations({ status: 'pending_icpdp' })
      .then((res) => setClubRegistrations((res.registrations || []).slice(0, 5)))
      .catch(() => setClubRegistrations([]))
      .finally(() => setClubRegsLoading(false));
  }, [isIcpdpDept]);

  if (!unit) {
    return (
      <PublicAdminShell activeNav="home">
        <div className="admin-fpt-dept-detail">
          <p>{t('admin.fpt.dept.notFound')}</p>
          <Link to="/">{t('admin.fpt.dept.back')}</Link>
        </div>
        <SiteFooter />
      </PublicAdminShell>
    );
  }

  const managePrimaryLabel = isIcpdpDept ? t('admin.fpt.dept.icpdp.manage') : unit.manageLabel;

  return (
    <PublicAdminShell activeNav="home">
      <div className="admin-fpt-system home-layout">
        <main className="admin-fpt-dept-detail">
          <Link to="/" className="admin-partner-detail__back">
            {t('admin.fpt.dept.back')}
          </Link>

          <div className="admin-fpt-dept-detail__hero">
            <div className="admin-fpt-dept-detail__cover-wrap">
              <img src={unit.coverImage} alt="" className="admin-fpt-dept-detail__cover" />
              <span className={`admin-fpt-unit-card__badge ${unit.type === 'icpdp' ? 'admin-fpt-unit-card__badge--icpdp' : 'admin-fpt-unit-card__badge--ctsv'}`}>
                {typeLabel}
              </span>
            </div>
            <div className="admin-fpt-dept-detail__intro">
              <span className="admin-fpt-dept-detail__role">{unit.roleLabel || unit.subtitle}</span>
              <h1>{unit.name}</h1>
              <p>{unit.description}</p>
              <div className="admin-fpt-dept-detail__hero-actions">
                <button
                  type="button"
                  className="admin-fpt-dept-card__btn admin-fpt-dept-card__btn--primary"
                  onClick={() => navigate(isIcpdpDept ? clubRegListPath : unit.manageLink)}
                >
                  {managePrimaryLabel}
                </button>
                {isIcpdpDept && (
                  <button
                    type="button"
                    className="admin-fpt-dept-card__btn admin-fpt-dept-card__btn--ghost"
                    onClick={() => navigate('/admin/event-requests')}
                  >
                    {t('admin.fpt.dept.eventRequests')}
                  </button>
                )}
                <button
                  type="button"
                  className="admin-fpt-dept-card__btn admin-fpt-dept-card__btn--ghost"
                  onClick={() => navigate('/admin/announcements')}
                >
                  {t('admin.fpt.dept.sendNotification')}
                </button>
                <AdminFptNotifBell className="admin-fpt-notif-bell--inline" />
              </div>
            </div>
          </div>

          <section className="admin-fpt-dept-detail__accounts">
            <header>
              <h2>{t('admin.fpt.dept.accountsTitle', { label: typeLabel })}</h2>
              <p>
                {loading
                  ? t('admin.fpt.section.partnersLoading')
                  : t('admin.fpt.dept.accountsCount', { count: total })}
              </p>
            </header>

            {loading ? (
              <p className="admin-partner-detail__muted">{t('admin.fpt.dept.accountsLoading')}</p>
            ) : accounts.length === 0 ? (
              <p className="admin-partner-detail__muted">
                {t('admin.fpt.dept.accountsEmpty', { label: typeLabel })}
              </p>
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
                      {acc.isActive !== false
                        ? t('admin.fpt.dept.accountActive')
                        : t('admin.fpt.dept.accountLocked')}
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
              {t('admin.fpt.dept.manageAllAccounts', { label: typeLabel })}
            </button>
          </section>

          {isIcpdpDept && (
            <section className="admin-fpt-dept-detail__club-approvals">
              <header>
                <h2>{t('admin.fpt.dept.clubApprovals')}</h2>
                <p>
                  {clubRegsLoading
                    ? t('admin.fpt.section.partnersLoading')
                    : clubRegistrations.length > 0
                      ? t('admin.fpt.dept.clubPendingCount', { count: clubRegistrations.length })
                      : t('admin.fpt.dept.clubPendingEmpty')}
                </p>
              </header>

              {clubRegsLoading ? (
                <p className="admin-partner-detail__muted">{t('admin.fpt.dept.accountsLoading')}</p>
              ) : clubRegistrations.length === 0 ? (
                <p className="admin-partner-detail__muted">{t('admin.fpt.dept.clubPendingHint')}</p>
              ) : (
                <ul className="admin-fpt-dept-detail__club-reg-list">
                  {clubRegistrations.map((reg) => (
                    <li key={reg.id}>
                      <div>
                        <strong>{reg.clubName}</strong>
                        <span>
                          {reg.category} · {reg.president}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="admin-fpt-dept-detail__club-reg-btn"
                        onClick={() => navigate(`${clubRegListPath}/${reg.id}`)}
                      >
                        {t('admin.fpt.dept.review')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                className="admin-fpt-dept-detail__manage-link"
                onClick={() => navigate(clubRegListPath)}
              >
                {t('admin.fpt.dept.viewAllClubRegs')}
              </button>
            </section>
          )}
        </main>
        <SiteFooter />
      </div>
    </PublicAdminShell>
  );
};

export default AdminFptDeptDetail;
