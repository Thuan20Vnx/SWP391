import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/I18nContext';
import '../../styles/admin-data-fields.css';

const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const IconSave = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M17 21v-8H7v8M7 3v5h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconBarcode = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M4 7V5h2v2H4Zm0 4V9h2v2H4Zm0 4v-2h2v2H4Zm4-8V5h1v2H8Zm0 4V9h1v2H8Zm0 4v-2h1v2H8Zm3-8V5h2v2h-2Zm0 4V9h2v2h-2Zm0 4v-2h2v2h-2Zm4-8V5h1v2h-1Zm0 4V9h1v2h-1Zm0 4v-2h1v2h-1Zm3-8V5h2v2h-2Zm0 4V9h2v2h-2Zm0 4v-2h2v2h-2Z" fill="currentColor" />
  </svg>
);

const IconEdit = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconToggleCheck = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const emptyCategoryForm = () => ({
  code: '',
  name: '',
  description: '',
  isActive: true,
});

export const categoryToForm = (item) => ({
  code: item?.code || '',
  name: item?.name || '',
  description: item?.description || '',
  isActive: item?.active !== false,
});

const AdminCategoryDeclareModal = ({ open, editingItem, onClose, onSubmit, submitting }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState(emptyCategoryForm);

  useEffect(() => {
    if (open) {
      setValues(editingItem ? categoryToForm(editingItem) : emptyCategoryForm());
    }
  }, [open, editingItem]);

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

  const title = useMemo(
    () =>
      editingItem
        ? t('admin.dataMaintenance.category.editTitle')
        : t('admin.dataMaintenance.category.addTitle'),
    [editingItem, t],
  );

  if (!open) return null;

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      code: values.code,
      name: values.name,
      description: values.description,
      active: values.isActive,
    });
  };

  return (
    <div className="admin-acc-modal-backdrop" onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className="admin-acc-modal admin-data-modal admin-data-modal--category"
        role="dialog"
        aria-labelledby="admin-category-modal-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="admin-data-modal__header">
          <div className="admin-data-modal__head-text">
            <h2 id="admin-category-modal-title" className="admin-data-modal__title">
              {title}
            </h2>
            <p className="admin-data-modal__subtitle">
              {editingItem
                ? t('admin.dataMaintenance.category.editSubtitle')
                : t('admin.dataMaintenance.category.addSubtitle')}
            </p>
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
          <div className="admin-data-field">
            <span className="admin-data-field__label admin-data-field__label--dark">
              {t('admin.dataMaintenance.category.code')}
            </span>
            <div className="admin-data-input-wrap">
              <input
                type="text"
                className="admin-data-input"
                value={values.code}
                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                placeholder={t('admin.dataMaintenance.category.codePlaceholder')}
                required
                disabled={submitting}
              />
              <span className="admin-data-input-wrap__icon" aria-hidden="true">
                <IconBarcode />
              </span>
            </div>
          </div>

          <div className="admin-data-field">
            <span className="admin-data-field__label admin-data-field__label--dark">
              {t('admin.dataMaintenance.category.name')}
            </span>
            <div className="admin-data-input-wrap">
              <input
                type="text"
                className="admin-data-input"
                value={values.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t('admin.dataMaintenance.category.namePlaceholder')}
                required
                disabled={submitting}
              />
              <span className="admin-data-input-wrap__icon" aria-hidden="true">
                <IconEdit />
              </span>
            </div>
          </div>

          <div className="admin-data-field">
            <span className="admin-data-field__label admin-data-field__label--dark">
              {t('admin.dataMaintenance.category.description')}
            </span>
            <textarea
              className="admin-data-textarea"
              rows={4}
              value={values.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder={t('admin.dataMaintenance.category.descriptionPlaceholder')}
              disabled={submitting}
            />
          </div>

          <div className="admin-data-toggle admin-data-toggle--stacked">
            <div className="admin-data-toggle__copy">
              <span className="admin-data-toggle__title">
                {t('admin.dataMaintenance.category.displayStatus')}
              </span>
              <p className="admin-data-toggle__hint">{t('admin.dataMaintenance.category.displayHint')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={values.isActive}
              className={`admin-data-toggle__switch admin-data-toggle__switch--club${values.isActive ? ' admin-data-toggle__switch--on' : ''}`}
              onClick={() => setField('isActive', !values.isActive)}
              disabled={submitting}
            >
              <span className="admin-data-toggle__thumb">
                {values.isActive && <IconToggleCheck />}
              </span>
            </button>
          </div>

          <footer className="admin-data-modal__footer">
            <button type="button" className="admin-acc-btn admin-acc-btn--ghost" onClick={onClose} disabled={submitting}>
              {t('admin.common.cancel')}
            </button>
            <button type="submit" className="admin-data-btn-add" disabled={submitting}>
              {editingItem ? <IconSave /> : <IconPlus />}
              {submitting
                ? t('admin.dataMaintenance.modal.saving')
                : editingItem
                  ? t('admin.dataMaintenance.modal.confirmSave')
                  : t('admin.dataMaintenance.modal.confirmCreate')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AdminCategoryDeclareModal;
