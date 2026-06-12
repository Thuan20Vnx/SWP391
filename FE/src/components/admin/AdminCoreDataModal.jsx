import React, { useEffect, useState } from 'react';
import AdminDataSelect from './AdminDataSelect';
import { useTranslation } from '../../i18n/I18nContext';
import '../../styles/admin-data-fields.css';

const AdminCoreDataModal = ({
  open,
  title,
  subtitle,
  fields,
  initialValues,
  onClose,
  onSubmit,
  submitting,
}) => {
  const { t } = useTranslation();
  const [values, setValues] = useState({});

  useEffect(() => {
    if (open) setValues(initialValues || {});
  }, [open, initialValues]);

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

  if (!open) return null;

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <div className="admin-acc-modal-backdrop" onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className="admin-acc-modal admin-data-modal"
        role="dialog"
        aria-labelledby="admin-core-data-modal-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="admin-data-modal__header">
          <div className="admin-data-modal__head-text">
            <h2 id="admin-core-data-modal-title" className="admin-data-modal__title">
              {title}
            </h2>
            {subtitle && <p className="admin-data-modal__subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="admin-data-modal__close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('admin.common.close')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="admin-data-modal__form">
          {fields.map((field) => {
            if (field.type === 'select') {
              return (
                <AdminDataSelect
                  key={field.name}
                  label={field.label}
                  value={values[field.name] ?? ''}
                  options={field.options}
                  onChange={(v) => handleChange(field.name, v)}
                  disabled={submitting}
                  required={field.required}
                />
              );
            }

            return (
              <div key={field.name} className="admin-data-field">
                <span className="admin-data-field__label">{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea
                    className="admin-data-textarea"
                    rows={3}
                    value={values[field.name] ?? ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    disabled={submitting}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    className="admin-data-input"
                    value={values[field.name] ?? ''}
                    onChange={(e) =>
                      handleChange(
                        field.name,
                        field.name === 'code' ? e.target.value.toUpperCase() : e.target.value,
                      )
                    }
                    required={field.required}
                    disabled={submitting}
                    placeholder={field.placeholder}
                    min={field.min}
                  />
                )}
              </div>
            );
          })}

          <footer className="admin-data-modal__footer">
            <button type="button" className="admin-acc-btn admin-acc-btn--ghost" onClick={onClose} disabled={submitting}>
              {t('admin.common.cancel')}
            </button>
            <button type="submit" className="admin-data-btn-add" disabled={submitting}>
              {submitting ? t('admin.dataMaintenance.modal.saving') : t('admin.dataMaintenance.modal.confirmSave')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AdminCoreDataModal;
