import React from 'react';
import { canAdminDeleteAccount } from '../../data/adminAccountsData';
import { useTranslation } from '../../i18n/I18nContext';

const IconView = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconEdit = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const AdminAccountActionBar = ({ account, onView, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const deletable = canAdminDeleteAccount(account.role);

  return (
    <div
      className="admin-acc-actions"
      role="group"
      aria-label={t('admin.accounts.action.groupAria', { name: account.name })}
    >
      <button
        type="button"
        className="admin-acc-action-btn admin-acc-action-btn--view"
        title={t('admin.accounts.action.viewTitle')}
        aria-label={t('admin.accounts.action.viewAria', { name: account.name })}
        onClick={() => onView(account)}
      >
        <IconView />
        <span className="admin-acc-action-btn__label">{t('admin.common.view')}</span>
      </button>
      <button
        type="button"
        className="admin-acc-action-btn admin-acc-action-btn--edit"
        title={t('admin.accounts.action.editTitle')}
        aria-label={t('admin.accounts.action.editAria', { name: account.name })}
        onClick={() => onEdit(account)}
      >
        <IconEdit />
        <span className="admin-acc-action-btn__label">{t('admin.common.edit')}</span>
      </button>
      <button
        type="button"
        className={`admin-acc-action-btn admin-acc-action-btn--danger${deletable ? '' : ' admin-acc-action-btn--disabled'}`}
        title={
          deletable
            ? t('admin.accounts.action.deleteTitle')
            : t('admin.accounts.action.deleteDisabledTitle')
        }
        aria-label={t('admin.accounts.action.deleteAria', { name: account.name })}
        disabled={!deletable}
        onClick={() => onDelete(account)}
      >
        <IconTrash />
        <span className="admin-acc-action-btn__label">{t('admin.common.delete')}</span>
      </button>
    </div>
  );
};

export default AdminAccountActionBar;
