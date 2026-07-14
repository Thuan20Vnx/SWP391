import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import AdminAccountActionBar from '../../components/admin/AdminAccountActionBar';
import AdminAccountEditModal from '../../components/admin/AdminAccountEditModal';
import AdminAccountViewModal from '../../components/admin/AdminAccountViewModal';
import AdminAddAccountModal from '../../components/admin/AdminAddAccountModal';
import AdminFilterDropdown from '../../components/admin/AdminFilterDropdown';
import {
  ADMIN_ACCOUNT_ROLE_FILTERS,
  ADMIN_ACCOUNT_ROLE_META,
  ADMIN_ACCOUNTS_PAGE_SIZE,
  canAdminDeleteAccount,
  formatAccountDate,
  getAccountInitials,
} from '../../data/adminAccountsData';
import {
  createAdminAccount,
  deleteAdminAccount,
  fetchAdminAccount,
  fetchAdminAccounts,
  lockAdminAccountTemporarily,
  resetAdminAccountPassword,
  updateAdminAccount,
  updateAdminAccountStatus,
} from '../../services/adminApi';
import { getUserRole, isAdminRole } from '../../utils/auth';
import { useTranslation } from '../../i18n/I18nContext';
import { resolveLabel } from '../../i18n/helpers';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-accounts.css';

const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const StatusToggle = ({ active, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={active}
    aria-label={label}
    className={`admin-acc-toggle${active ? ' admin-acc-toggle--on' : ''}`}
    onClick={() => onChange(!active)}
  >
    <span className="admin-acc-toggle__track">
      <span className="admin-acc-toggle__thumb">{active ? '✓' : ''}</span>
    </span>
  </button>
);

const AdminAccountsControl = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast, adminSearch = '' } = useOutletContext() || {};
  const { t } = useTranslation();
  const role = getUserRole();
  const initialRole = searchParams.get('role');
  const validInitialRole = ADMIN_ACCOUNT_ROLE_FILTERS.some((tab) => tab.key === initialRole)
    ? initialRole
    : 'all';
  const [roleFilter, setRoleFilter] = useState(validInitialRole);
  const [page, setPage] = useState(1);
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const search = adminSearch;

  useEffect(() => {
    if (!isAdminRole(role)) {
      showToast?.(t('admin.common.noAccess'), 'error');
      navigate('/profile');
    }
  }, [role, navigate, showToast, t]);

  const loadAccounts = useCallback(async () => {
    if (!isAdminRole(role)) return;
    setLoading(true);
    try {
      const data = await fetchAdminAccounts({
        page,
        limit: ADMIN_ACCOUNTS_PAGE_SIZE,
        role: roleFilter,
        search: search.trim(),
      });
      setAccounts(data.accounts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      showToast?.(err.message || t('admin.accounts.toast.loadFail'), 'error');
      setAccounts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search, role, showToast, t]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const patchAccountInList = (updated) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    setSelectedAccount((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const pageStart = total === 0 ? 0 : (page - 1) * ADMIN_ACCOUNTS_PAGE_SIZE + 1;
  const pageEnd = Math.min(page * ADMIN_ACCOUNTS_PAGE_SIZE, total);
  const pageRows = accounts;

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    const start = Math.max(1, Math.min(page - 2, totalPages - maxButtons + 1));
    const end = Math.min(totalPages, start + maxButtons - 1);
    const nums = [];
    for (let i = start; i <= end; i += 1) nums.push(i);
    return nums;
  }, [page, totalPages]);

  const roleOptions = useMemo(
    () =>
      ADMIN_ACCOUNT_ROLE_FILTERS.map((tab) => ({
        value: tab.key,
        label: resolveLabel(tab, t),
      })),
    [t],
  );

  const toggleActive = async (acc) => {
    // Tài khoản đang bị khóa tạm thời → toggle hiển thị tắt; bật lại nghĩa là mở khóa.
    if (acc.lockUntil) {
      await handleUnlockAccount(acc);
      return;
    }
    const next = !acc.active;
    try {
      const data = await updateAdminAccountStatus(acc.id, next);
      patchAccountInList(data.account);
      showToast?.(data.message || t('admin.accounts.toast.statusUpdated'), 'success');
    } catch (err) {
      showToast?.(err.message || t('admin.accounts.toast.updateFail'), 'error');
    }
  };

  const handleCreateAccount = async (form) => {
    if (!form.role) {
      showToast?.(t('admin.accounts.toast.roleRequired'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      const data = await createAdminAccount({
        role: form.role,
        fullname: form.fullname,
        email: form.email,
        identifier: form.identifier,
        unitInfo: form.unitInfo,
        activateNow: form.activateNow,
      });
      setModalOpen(false);
      showToast?.(data.message || t('admin.accounts.toast.createSuccess'), 'success');
      if (page !== 1) {
        setPage(1);
      } else {
        await loadAccounts();
      }
    } catch (err) {
      showToast?.(err.message || t('admin.accounts.toast.createFail'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (acc) => {
    if (!canAdminDeleteAccount(acc.role)) {
      showToast?.(t('admin.accounts.toast.deleteNotAllowed'), 'error');
      return;
    }
    const ok = window.confirm(
      t('admin.accounts.toast.deleteConfirm', { name: acc.name, email: acc.email }),
    );
    if (!ok) return;

    try {
      const data = await deleteAdminAccount(acc.id);
      showToast?.(data.message || t('admin.accounts.toast.deleteSuccess'), 'success');
      await loadAccounts();
    } catch (err) {
      showToast?.(err.message || t('admin.accounts.toast.deleteFail'), 'error');
    }
  };

  const handleLockAccount = async (acc, days) => {
    try {
      const data = await lockAdminAccountTemporarily(acc.id, days);
      patchAccountInList(data.account);
      showToast?.(data.message || t('admin.accounts.toast.lockSuccess'), 'success');
    } catch (err) {
      showToast?.(err.message || t('admin.accounts.toast.lockFail'), 'error');
    }
  };

  const handleUnlockAccount = async (acc) => {
    try {
      const data = await lockAdminAccountTemporarily(acc.id, 0);
      patchAccountInList(data.account);
      showToast?.(data.message || t('admin.accounts.toast.unlockSuccess'), 'success');
    } catch (err) {
      showToast?.(err.message || t('admin.accounts.toast.lockFail'), 'error');
    }
  };

  const openView = async (acc) => {
    setSelectedAccount(acc);
    setViewOpen(true);
    try {
      const data = await fetchAdminAccount(acc.id);
      if (data.account) setSelectedAccount((prev) => ({ ...prev, ...data.account }));
    } catch {
      /* giữ dữ liệu từ danh sách nếu tải chi tiết lỗi */
    }
  };

  const openEdit = async (acc) => {
    try {
      const data = await fetchAdminAccount(acc.id);
      setSelectedAccount(data.account || acc);
    } catch {
      setSelectedAccount(acc);
    }
    setEditOpen(true);
  };

  const handleEditSubmit = async (payload) => {
    if (!selectedAccount) return;
    setSubmitting(true);
    try {
      const data = await updateAdminAccount(selectedAccount.id, payload);
      patchAccountInList(data.account);
      setEditOpen(false);
      showToast?.(data.message || t('admin.accounts.toast.editSuccess'), 'success');
    } catch (err) {
      showToast?.(err.message || t('admin.accounts.toast.updateFail'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (acc) => {
    const ok = window.confirm(
      `Đặt lại mật khẩu cho ${acc.name} (${acc.email}) về mặc định và gửi email thông báo?`,
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      const data = await resetAdminAccountPassword(acc.id);
      showToast?.(data.message || 'Đã đặt lại mật khẩu.', 'success');
    } catch (err) {
      showToast?.(err.message || t('admin.accounts.toast.updateFail'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdminRole(role)) return null;

  return (
    <main className="admin-main">
      <div className="admin-acc-page">
        <header className="admin-acc-page__header">
          <h1 className="admin-main__title">{t('admin.accounts.title')}</h1>
          <button
            type="button"
            className="admin-acc-btn admin-acc-btn--primary"
            onClick={() => setModalOpen(true)}
          >
            <IconPlus />
            {t('admin.accounts.addAccount')}
          </button>
        </header>

        <div className="admin-acc-filters" aria-label={t('admin.accounts.filterByRole')}>
          <AdminFilterDropdown
            label=""
            value={roleFilter}
            options={roleOptions}
            onChange={(next) => {
              setRoleFilter(next);
              setPage(1);
            }}
            menuOpen={openMenu === 'role'}
            onMenuToggle={setOpenMenu}
            menuId="role"
          />
        </div>

        <section className="admin-panel admin-acc-table-panel">
          <div className="admin-acc-table-wrap">
            <table className="admin-acc-table">
              <thead>
                <tr>
                  <th>{t('admin.accounts.col.fullName')}</th>
                  <th>{t('admin.accounts.col.role')}</th>
                  <th>{t('admin.accounts.col.email')}</th>
                  <th>{t('admin.accounts.col.createdAt')}</th>
                  <th>{t('admin.accounts.col.status')}</th>
                  <th>{t('admin.accounts.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="admin-acc-table__empty">
                      {t('admin.accounts.loadingList')}
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-acc-table__empty">
                      {t('admin.accounts.emptyList')}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((acc) => {
                    const meta = ADMIN_ACCOUNT_ROLE_META[acc.role] || {
                      label: acc.role,
                      badgeClass: 'admin-acc-badge--attendee',
                    };
                    return (
                      <tr key={acc.id}>
                        <td data-label={t('admin.accounts.col.fullName')}>
                          <div className="admin-acc-user">
                            <span className="admin-acc-user__avatar" aria-hidden="true">
                              {getAccountInitials(acc.name)}
                            </span>
                            <span className="admin-acc-user__name">{acc.name}</span>
                          </div>
                        </td>
                        <td data-label={t('admin.accounts.col.role')}>
                          <span className={`admin-acc-badge ${meta.badgeClass}`}>
                            {resolveLabel(meta, t)}
                          </span>
                        </td>
                        <td data-label={t('admin.accounts.col.email')}>
                          <span className="admin-acc-email-cell">
                            {acc.email}
                            {acc.isGoogle && (
                              <span className="admin-acc-google-chip" title="Đăng nhập bằng Google">
                                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                                  <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                                  <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75z" />
                                </svg>
                                Google
                              </span>
                            )}
                          </span>
                        </td>
                        <td data-label={t('admin.accounts.col.createdAt')}>
                          {formatAccountDate(acc.createdAt)}
                        </td>
                        <td data-label={t('admin.accounts.col.status')}>
                          <StatusToggle
                            active={acc.active && !acc.lockUntil}
                            onChange={() => toggleActive(acc)}
                            label={t('admin.accounts.statusToggle', { name: acc.name })}
                          />
                        </td>
                        <td data-label={t('admin.accounts.col.actions')}>
                          <AdminAccountActionBar
                            account={acc}
                            onView={openView}
                            onEdit={openEdit}
                            onLock={handleLockAccount}
                            onUnlock={handleUnlockAccount}
                            onDelete={handleDeleteAccount}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="admin-acc-pagination">
            <p className="admin-acc-pagination__info">
              {total === 0
                ? t('admin.accounts.pagination.none')
                : t('admin.accounts.pagination.range', {
                    start: pageStart,
                    end: pageEnd,
                    total,
                  })}
            </p>
            <nav className="admin-acc-pagination__nav" aria-label={t('admin.common.pagination')}>
              <button
                type="button"
                className="admin-acc-page-btn"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t('admin.common.prevPage')}
              >
                ‹
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`admin-acc-page-btn${page === n ? ' admin-acc-page-btn--active' : ''}`}
                  onClick={() => setPage(n)}
                  aria-current={page === n ? 'page' : undefined}
                  disabled={loading && page !== n}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="admin-acc-page-btn"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t('admin.common.nextPage')}
              >
                ›
              </button>
            </nav>
          </footer>
        </section>
      </div>

      <AdminAddAccountModal
        open={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        onSubmit={handleCreateAccount}
        submitting={submitting}
      />

      <AdminAccountViewModal
        open={viewOpen}
        account={selectedAccount}
        onClose={() => setViewOpen(false)}
        onEdit={(acc) => {
          setViewOpen(false);
          openEdit(acc);
        }}
      />

      <AdminAccountEditModal
        open={editOpen}
        account={selectedAccount}
        onClose={() => !submitting && setEditOpen(false)}
        onSubmit={handleEditSubmit}
        onResetPassword={handleResetPassword}
        submitting={submitting}
      />

    </main>
  );
};

export default AdminAccountsControl;
