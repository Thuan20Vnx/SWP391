import React, { useEffect, useMemo, useState } from 'react';
import AdminFilterDropdown from './AdminFilterDropdown';
import AdminRolePicker from './AdminRolePicker';
import {
  ADMIN_ACCOUNT_ROLE_META,
  ADMIN_CAMPUS_OPTIONS,
  ADMIN_COURSE_OPTIONS,
  accountToEditForm,
} from '../../data/adminAccountsData';
import { useTranslation } from '../../i18n/I18nContext';
import { mapSelectOptions, resolveLabel } from '../../i18n/helpers';

const AdminAccountEditModal = ({ open, account, onClose, onSubmit, submitting }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(accountToEditForm(account || {}));
  const [openMenu, setOpenMenu] = useState(null);

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

  if (!open || !account) return null;

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const isAdmin = account.role === 'admin';
  const showStudentFields = form.role === 'student' || account.role === 'student';

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
                  menuId="edit-course"
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
                menuId="edit-campus"
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
