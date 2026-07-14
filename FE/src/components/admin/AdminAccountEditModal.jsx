import React, { useEffect, useMemo, useState } from 'react';
import AdminFilterDropdown from './AdminFilterDropdown';
import AdminRolePicker from './AdminRolePicker';
import {
  ADMIN_ACCOUNT_ROLE_META,
  ADMIN_CAMPUS_OPTIONS,
  ADMIN_COURSE_OPTIONS,
  accountToEditForm,
} from '../../data/adminAccountsData';
import { fetchAdminAssignableClubs } from '../../services/adminApi';
import { useTranslation } from '../../i18n/I18nContext';
import { mapSelectOptions, resolveLabel } from '../../i18n/helpers';

const AdminAccountEditModal = ({ open, account, onClose, onSubmit, onResetPassword, submitting }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(accountToEditForm(account || {}));
  const [openMenu, setOpenMenu] = useState(null);
  const [clubs, setClubs] = useState([]);

  const courseOptions = useMemo(() => mapSelectOptions(ADMIN_COURSE_OPTIONS, t), [t]);
  const campusOptions = useMemo(() => mapSelectOptions(ADMIN_CAMPUS_OPTIONS, t), [t]);

  useEffect(() => {
    if (!open || !account) return undefined;
    setForm(accountToEditForm(account));

    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, account, onClose, submitting]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchAdminAssignableClubs()
      .then((data) => {
        if (!cancelled && data?.success) setClubs(data.clubs || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open || !account) return null;

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const isAdmin = account.role === 'admin';
  const showStudentFields = form.role === 'student' || account.role === 'student';
  const isClubRole = form.role === 'club_organizer';
  const clubOptions = clubs.map((c) => ({
    value: c.id,
    label: c.hasManager && c.id !== form.managedClubId ? `${c.name} (đã có quản lý)` : c.name,
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      role: form.role,
      fullname: form.fullname,
      email: form.email,
      studentId: form.mssv,
      phone: form.phone,
      unitInfo: form.unitInfo,
      course: form.course,
      campus: form.campus,
      isActive: form.isActive,
      ...(isClubRole ? { managedClubId: form.managedClubId || '' } : {}),
    });
  };

  return (
    <div className="admin-acc-modal-backdrop" onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className="admin-acc-modal admin-acc-modal--edit"
        role="dialog"
        aria-labelledby="admin-edit-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-acc-modal__header">
          <h2 id="admin-edit-account-title">{t('admin.accounts.modal.edit.title')}</h2>
          <button
            type="button"
            className="admin-acc-modal__close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('admin.common.close')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <form className="admin-acc-modal__form" onSubmit={handleSubmit}>
          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">{t('admin.accounts.modal.edit.systemRole')}</span>
            {isAdmin ? (
              <input
                type="text"
                className="admin-acc-modal__input admin-acc-modal__input--readonly"
                value={resolveLabel(ADMIN_ACCOUNT_ROLE_META.admin, t)}
                readOnly
              />
            ) : (
              <AdminRolePicker
                value={form.role || ''}
                onChange={(v) => patch('role', v)}
                name="edit-account-role"
              />
            )}
          </label>

          {isClubRole && (
            <label className="admin-acc-modal__field">
              <span className="admin-acc-modal__label">Câu lạc bộ phụ trách</span>
              <AdminFilterDropdown
                label=""
                value={form.managedClubId || ''}
                options={[{ value: '', label: '— Chưa gán CLB —' }, ...clubOptions]}
                onChange={(v) => patch('managedClubId', v)}
                menuOpen={openMenu === 'club'}
                onMenuToggle={setOpenMenu}
                menuId="club"
              />
              <span className="admin-acc-modal__note">
                Chọn CLB mà tài khoản này sẽ làm Ban tổ chức / quản lý.
              </span>
            </label>
          )}

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">{t('admin.accounts.modal.edit.fullname')}</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder={t('admin.accounts.modal.edit.fullnamePlaceholder')}
              value={form.fullname}
              onChange={(e) => patch('fullname', e.target.value)}
              required
            />
          </label>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">{t('admin.accounts.modal.edit.email')}</span>
            <input
              type="email"
              className={`admin-acc-modal__input${isAdmin ? ' admin-acc-modal__input--readonly' : ''}`}
              value={form.email}
              onChange={(e) => patch('email', e.target.value)}
              readOnly={isAdmin}
              required
            />
            {isAdmin && (
              <span className="admin-acc-modal__note">{t('admin.accounts.modal.edit.adminNote')}</span>
            )}
          </label>

          <div className="admin-acc-modal__row">
            <label className="admin-acc-modal__field">
              <span className="admin-acc-modal__label">{t('admin.accounts.modal.edit.mssv')}</span>
              <input
                type="text"
                className="admin-acc-modal__input"
                placeholder={t('admin.accounts.modal.edit.mssvPlaceholder')}
                value={form.mssv}
                onChange={(e) => patch('mssv', e.target.value)}
              />
            </label>
            <label className="admin-acc-modal__field">
              <span className="admin-acc-modal__label">{t('admin.accounts.modal.edit.phone')}</span>
              <input
                type="tel"
                className="admin-acc-modal__input"
                placeholder="0901234567"
                value={form.phone}
                onChange={(e) => patch('phone', e.target.value)}
              />
            </label>
          </div>

          <div className="admin-acc-modal__row">
            <label className="admin-acc-modal__field">
              <span className="admin-acc-modal__label">{t('admin.accounts.modal.edit.course')}</span>
              {showStudentFields ? (
                <AdminFilterDropdown
                  label=""
                  value={form.course || 'K18'}
                  options={courseOptions}
                  onChange={(v) => patch('course', v)}
                  menuOpen={openMenu === 'course'}
                  onMenuToggle={setOpenMenu}
                  menuId="course"
                />
              ) : (
                <input
                  type="text"
                  className="admin-acc-modal__input"
                  value={form.course}
                  onChange={(e) => patch('course', e.target.value)}
                  placeholder="K18"
                />
              )}
            </label>
            <label className="admin-acc-modal__field">
              <span className="admin-acc-modal__label">{t('admin.accounts.modal.edit.campus')}</span>
              <AdminFilterDropdown
                label=""
                value={form.campus || ADMIN_CAMPUS_OPTIONS[0].value}
                options={campusOptions}
                onChange={(v) => patch('campus', v)}
                menuOpen={openMenu === 'campus'}
                onMenuToggle={setOpenMenu}
                menuId="campus"
              />
            </label>
          </div>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">{t('admin.accounts.modal.edit.unitInfo')}</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder={t('admin.accounts.modal.edit.unitInfoPlaceholder')}
              value={form.unitInfo}
              onChange={(e) => patch('unitInfo', e.target.value)}
            />
          </label>

          {account.isGoogle && (
            <div className="admin-acc-google-note">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75z" />
              </svg>
              <span>Tài khoản này đăng nhập bằng Google.</span>
            </div>
          )}

          <div className="admin-acc-modal__toggle-row">
            <div>
              <p className="admin-acc-modal__toggle-label">Đặt lại mật khẩu</p>
              <p className="admin-acc-modal__toggle-desc">
                Đưa mật khẩu về mặc định và gửi email thông báo cho người dùng.
              </p>
            </div>
            <button
              type="button"
              className="admin-acc-btn admin-acc-btn--ghost admin-acc-btn--reset"
              onClick={() => onResetPassword?.(account)}
              disabled={submitting || isAdmin}
            >
              Đặt lại mật khẩu
            </button>
          </div>

          <div className="admin-acc-modal__toggle-row">
            <div>
              <p className="admin-acc-modal__toggle-label">{t('admin.accounts.modal.edit.activate')}</p>
              <p className="admin-acc-modal__toggle-desc">{t('admin.accounts.modal.edit.activateDesc')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              className={`admin-acc-modal__switch${form.isActive ? ' admin-acc-modal__switch--on' : ''}`}
              onClick={() => patch('isActive', !form.isActive)}
              disabled={isAdmin}
            >
              <span className="admin-acc-modal__switch-thumb" />
            </button>
          </div>

          <footer className="admin-acc-modal__footer">
            <button
              type="button"
              className="admin-acc-btn admin-acc-btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              {t('admin.common.cancel')}
            </button>
            <button type="submit" className="admin-acc-btn admin-acc-btn--primary" disabled={submitting}>
              {submitting ? t('admin.accounts.modal.edit.saving') : t('admin.accounts.modal.edit.submit')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AdminAccountEditModal;
