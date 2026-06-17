import React, { useEffect, useState } from 'react';
import AdminRolePicker from './AdminRolePicker';
import { useTranslation } from '../../i18n/I18nContext';

const EMPTY_FORM = {
  role: '',
  fullname: '',
  email: '',
  identifier: '',
  unitInfo: '',
  activateNow: true,
};

const AdminAddAccountModal = ({ open, onClose, onSubmit, submitting }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
    }
  }, [open]);

  if (!open) return null;

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="admin-acc-modal-backdrop" onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className="admin-acc-modal"
        role="dialog"
        aria-labelledby="admin-add-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-acc-modal__header">
          <h2 id="admin-add-account-title">{t('admin.accounts.modal.add.title')}</h2>
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
          <div className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">{t('admin.accounts.modal.add.systemRole')}</span>
            <AdminRolePicker
              value={form.role || ''}
              onChange={(v) => patch('role', v)}
              name="add-account-role"
            />
            {!form.role && (
              <span className="admin-acc-modal__note">{t('admin.accounts.modal.add.selectRoleNote')}</span>
            )}
          </div>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">{t('admin.accounts.modal.add.fullname')}</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder={t('admin.accounts.modal.add.fullnamePlaceholder')}
              value={form.fullname}
              onChange={(e) => patch('fullname', e.target.value)}
              required
            />
          </label>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">{t('admin.accounts.modal.add.email')}</span>
            <input
              type="email"
              className="admin-acc-modal__input"
              placeholder={t('admin.accounts.modal.add.emailPlaceholder')}
              value={form.email}
              onChange={(e) => patch('email', e.target.value)}
              required
            />
            <span className="admin-acc-modal__note">{t('admin.accounts.modal.add.emailNote')}</span>
          </label>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">{t('admin.accounts.modal.add.identifier')}</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder={t('admin.accounts.modal.add.identifierPlaceholder')}
              value={form.identifier}
              onChange={(e) => patch('identifier', e.target.value)}
            />
          </label>

          <label className="admin-acc-modal__field">
            <span className="admin-acc-modal__label">{t('admin.accounts.modal.add.unitInfo')}</span>
            <input
              type="text"
              className="admin-acc-modal__input"
              placeholder={t('admin.accounts.modal.add.unitInfoPlaceholder')}
              value={form.unitInfo}
              onChange={(e) => patch('unitInfo', e.target.value)}
            />
          </label>

          <div className="admin-acc-modal__toggle-row">
            <div>
              <p className="admin-acc-modal__toggle-label">{t('admin.accounts.modal.add.activateNow')}</p>
              <p className="admin-acc-modal__toggle-desc">{t('admin.accounts.modal.add.activateNowDesc')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.activateNow}
              className={`admin-acc-modal__switch${form.activateNow ? ' admin-acc-modal__switch--on' : ''}`}
              onClick={() => patch('activateNow', !form.activateNow)}
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
              {submitting ? t('admin.accounts.modal.add.creating') : t('admin.accounts.modal.add.submit')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AdminAddAccountModal;
