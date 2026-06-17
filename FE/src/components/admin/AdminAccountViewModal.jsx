import React, { useEffect, useMemo } from 'react';
import {
  ADMIN_ACCOUNT_ROLE_META,
  formatAccountDate,
  getAccountInitials,
} from '../../data/adminAccountsData';
import { useTranslation } from '../../i18n/I18nContext';
import { resolveLabel } from '../../i18n/helpers';

const AdminAccountViewModal = ({ open, account, onClose, onEdit }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const rows = useMemo(() => {
    if (!account) return [];
    const meta = ADMIN_ACCOUNT_ROLE_META[account.role] || {
      label: account.role,
      badgeClass: 'admin-acc-badge--attendee',
    };
    const empty = t('admin.common.empty');

    return [
      { label: t('admin.accounts.modal.view.field.fullName'), value: account.name },
      { label: t('admin.accounts.modal.view.field.email'), value: account.email },
      {
        label: t('admin.accounts.modal.view.field.role'),
        value: resolveLabel(meta, t),
        badge: meta.badgeClass,
      },
      { label: t('admin.accounts.modal.view.field.mssv'), value: account.mssv || empty },
      { label: t('admin.accounts.modal.view.field.phone'), value: account.phone || empty },
      { label: t('admin.accounts.modal.view.field.course'), value: account.course || empty },
      { label: t('admin.accounts.modal.view.field.campus'), value: account.campus || empty },
      { label: t('admin.accounts.modal.view.field.unitInfo'), value: account.unitInfo || empty },
      {
        label: t('admin.accounts.modal.view.field.createdAt'),
        value: formatAccountDate(account.createdAt),
      },
      {
        label: t('admin.accounts.modal.view.field.status'),
        value: account.active
          ? t('admin.accounts.modal.view.statusActive')
          : t('admin.accounts.modal.view.statusInactive'),
        status: account.active ? 'active' : 'inactive',
      },
    ];
  }, [account, t]);

  if (!open || !account) return null;

  return (
    <div className="admin-acc-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-acc-modal admin-acc-modal--view"
        role="dialog"
        aria-labelledby="admin-view-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-acc-modal__header">
          <div className="admin-acc-modal__profile">
            <span className="admin-acc-modal__avatar" aria-hidden="true">
              {getAccountInitials(account.name)}
            </span>
            <div>
              <h2 id="admin-view-account-title">{account.name}</h2>
              <p className="admin-acc-modal__sub">{account.email}</p>
            </div>
          </div>
          <button
            type="button"
            className="admin-acc-modal__close"
            onClick={onClose}
            aria-label={t('admin.common.close')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="admin-acc-detail-grid">
          {rows.map((row) => (
            <div key={row.label} className="admin-acc-detail-grid__item">
              <span className="admin-acc-detail-grid__label">{row.label}</span>
              {row.badge ? (
                <span className={`admin-acc-badge ${row.badge}`}>{row.value}</span>
              ) : row.status ? (
                <span
                  className={`admin-acc-detail-status admin-acc-detail-status--${row.status}`}
                >
                  {row.value}
                </span>
              ) : (
                <span className="admin-acc-detail-grid__value">{row.value}</span>
              )}
            </div>
          ))}
        </div>

        <footer className="admin-acc-modal__footer">
          <button type="button" className="admin-acc-btn admin-acc-btn--ghost" onClick={onClose}>
            {t('admin.common.close')}
          </button>
          <button
            type="button"
            className="admin-acc-btn admin-acc-btn--primary"
            onClick={() => {
              onClose();
              onEdit?.(account);
            }}
          >
            {t('admin.common.edit')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AdminAccountViewModal;
