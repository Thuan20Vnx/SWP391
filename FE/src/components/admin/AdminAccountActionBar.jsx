import React, { useEffect, useRef, useState } from 'react';
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

const IconLock = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <rect x="4" y="10" width="16" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const LOCK_PRESET_DAYS = [3, 5, 7];

const AdminAccountActionBar = ({ account, onView, onEdit, onDelete, onLock, onUnlock }) => {
  const { t } = useTranslation();
  const deletable = canAdminDeleteAccount(account.role);
  const lockable = account.role !== 'admin';
  const isLocked = Boolean(account.lockUntil);

  const [menuOpen, setMenuOpen] = useState(false);
  const [customDays, setCustomDays] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const applyLock = (days) => {
    onLock?.(account, days);
    setMenuOpen(false);
    setCustomDays('');
  };

  const submitCustom = () => {
    const n = Number(customDays);
    if (!Number.isFinite(n) || n <= 0) return;
    applyLock(Math.ceil(n));
  };

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
      {lockable && (
        <div className="admin-acc-lock" ref={wrapRef}>
          <button
            type="button"
            className={`admin-acc-action-btn admin-acc-action-btn--lock${isLocked ? ' admin-acc-action-btn--locked' : ''}`}
            title={
              isLocked
                ? t('admin.accounts.action.lockedTitle')
                : t('admin.accounts.action.lockTitle')
            }
            aria-label={t('admin.accounts.action.lockAria', { name: account.name })}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <IconLock />
            <span className="admin-acc-action-btn__label">{t('admin.accounts.action.lock')}</span>
          </button>
          {menuOpen && (
            <div className="admin-acc-lock__menu" role="menu">
              <p className="admin-acc-lock__title">{t('admin.accounts.action.lockMenuTitle')}</p>
              <div className="admin-acc-lock__presets">
                {LOCK_PRESET_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="admin-acc-lock__preset"
                    role="menuitem"
                    onClick={() => applyLock(d)}
                  >
                    {t('admin.accounts.action.lockDays', { days: d })}
                  </button>
                ))}
              </div>
              <div className="admin-acc-lock__custom">
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="admin-acc-lock__input"
                  placeholder={t('admin.accounts.action.lockCustomPlaceholder')}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
                />
                <button
                  type="button"
                  className="admin-acc-lock__confirm"
                  onClick={submitCustom}
                  disabled={!customDays || Number(customDays) <= 0}
                >
                  {t('admin.accounts.action.lockConfirm')}
                </button>
              </div>
              {isLocked && (
                <button
                  type="button"
                  className="admin-acc-lock__unlock"
                  role="menuitem"
                  onClick={() => {
                    onUnlock?.(account);
                    setMenuOpen(false);
                  }}
                >
                  {t('admin.accounts.action.unlock')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
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
