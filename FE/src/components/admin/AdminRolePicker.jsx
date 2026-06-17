import React from 'react';
import { ADMIN_ROLE_PICKER_OPTIONS } from '../../data/adminAccountsData';
import { useTranslation } from '../../i18n/I18nContext';
import { resolveDescription, resolveLabel } from '../../i18n/helpers';

const RoleIcon = ({ tone }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (tone) {
    case 'ctsv':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path {...common} d="M12 3L4 7v6c0 4.2 3.4 7.4 8 8 4.6-.6 8-3.8 8-8V7l-8-4Z" />
          <path {...common} d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'icpdp':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path {...common} d="M4 19V5h16v14M8 9h8M8 13h5" />
        </svg>
      );
    case 'partner':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path {...common} d="M3 21h18M6 21V9l6-4 6 4v12" />
          <path {...common} d="M10 13h4" />
        </svg>
      );
    case 'club':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path {...common} d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle {...common} cx="10" cy="7" r="4" />
          <path {...common} d="M20 8v6M23 11h-6" />
        </svg>
      );
    case 'student':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path {...common} d="M22 10L12 5 2 10l10 5 10-5Z" />
          <path {...common} d="M6 12v5c2 1.5 4 2 6 2s4-.5 6-2v-5" />
        </svg>
      );
    case 'attendee':
    default:
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path {...common} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle {...common} cx="12" cy="7" r="4" />
        </svg>
      );
  }
};

const AdminRolePicker = ({ value, onChange, disabled = false, name = 'account-role' }) => {
  const { t } = useTranslation();

  return (
    <div className="admin-role-picker" role="radiogroup" aria-label={t('admin.accounts.rolePicker.aria')}>
      {ADMIN_ROLE_PICKER_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`admin-role-picker__card admin-role-picker__card--${opt.tone}${selected ? ' admin-role-picker__card--selected' : ''}${disabled ? ' admin-role-picker__card--disabled' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
              className="admin-role-picker__input"
            />
            <span className={`admin-role-picker__icon admin-role-picker__icon--${opt.tone}`}>
              <RoleIcon tone={opt.tone} />
            </span>
            <span className="admin-role-picker__text">
              <span className="admin-role-picker__title">{resolveLabel(opt, t)}</span>
              <span className="admin-role-picker__desc">{resolveDescription(opt, t)}</span>
            </span>
            <span className="admin-role-picker__check" aria-hidden="true">
              {selected && (
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    d="M20 6L9 17l-5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default AdminRolePicker;
