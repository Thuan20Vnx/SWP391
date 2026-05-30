import React, { useEffect, useState } from 'react';
import AdminDataSelect from './AdminDataSelect';
import {
  FACILITY_EQUIPMENT_OPTIONS,
  RESOURCE_TYPES,
  emptyFacilityForm,
  facilityToForm,
} from '../../data/adminDataMaintenanceData';
import '../../styles/admin-data-fields.css';

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

const IconCheckSmall = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path
      d="M20 6L9 17l-5-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconToggleCheck = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AdminFacilityResourceModal = ({
  open,
  editingItem,
  onClose,
  onSubmit,
  submitting,
}) => {
  const [values, setValues] = useState(emptyFacilityForm);

  useEffect(() => {
    if (open) {
      setValues(editingItem ? facilityToForm(editingItem) : emptyFacilityForm());
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

  if (!open) return null;

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const toggleEquipment = (key) => {
    setValues((prev) => ({
      ...prev,
      equipment: { ...prev.equipment, [key]: !prev.equipment[key] },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  const title = editingItem ? 'Chỉnh sửa tài nguyên' : 'Thêm tài nguyên mới';

  return (
    <div className="admin-acc-modal-backdrop" onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className="admin-acc-modal admin-data-modal admin-data-modal--facility"
        role="dialog"
        aria-labelledby="admin-facility-modal-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="admin-data-modal__header">
          <div className="admin-data-modal__head-text">
            <h2 id="admin-facility-modal-title" className="admin-data-modal__title">
              {title}
            </h2>
            <p className="admin-data-modal__subtitle">
              {editingItem
                ? 'Cập nhật thông tin phòng, hội trường hoặc sân bãi trên hệ thống.'
                : 'Khai báo hội trường, phòng họp hoặc sân bãi vào hệ thống dữ liệu lõi.'}
            </p>
          </div>
          <button
            type="button"
            className="admin-data-modal__close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="admin-data-modal__form">
          <AdminDataSelect
            label="Loại tài nguyên"
            labelClassName="admin-data-field__label--dark"
            value={values.resourceType}
            options={RESOURCE_TYPES}
            onChange={(v) => setField('resourceType', v)}
            disabled={submitting}
            required
          />

          <div className="admin-data-field">
            <span className="admin-data-field__label admin-data-field__label--dark">Tên phòng / hội trường</span>
            <input
              type="text"
              className="admin-data-input"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Nhập tên phòng hoặc khu vực sân bãi..."
              required
              disabled={submitting}
            />
          </div>

          <div className="admin-data-field">
            <span className="admin-data-field__label admin-data-field__label--dark">Sức chứa tối đa (người)</span>
            <input
              type="number"
              className="admin-data-input"
              value={values.capacity}
              onChange={(e) => setField('capacity', e.target.value)}
              placeholder="Nhập số lượng người chứa tối đa (Ví dụ: 500)..."
              min={1}
              required
              disabled={submitting}
            />
          </div>

          <div className="admin-data-field">
            <span className="admin-data-field__label admin-data-field__label--dark">Vị trí tòa nhà</span>
            <input
              type="text"
              className="admin-data-input"
              value={values.building}
              onChange={(e) => setField('building', e.target.value)}
              placeholder="Nhập tên tòa nhà (Ví dụ: Tòa Gamma, Tòa Delta)..."
              required
              disabled={submitting}
            />
          </div>

          <div className="admin-data-check-group">
            <span className="admin-data-check-group__label admin-data-field__label--dark">Trang thiết bị sẵn có</span>
            <div className="admin-data-check-list admin-data-check-list--inline">
              {FACILITY_EQUIPMENT_OPTIONS.map((opt) => {
                const checked = !!values.equipment[opt.key];
                return (
                  <label
                    key={opt.key}
                    className={`admin-data-check-card${checked ? ' admin-data-check-card--checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEquipment(opt.key)}
                      disabled={submitting}
                    />
                    <span className="admin-data-check-card__box" aria-hidden="true">
                      <IconCheckSmall />
                    </span>
                    <span className="admin-data-check-card__text">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="admin-data-toggle admin-data-toggle--facility">
            <p className="admin-data-toggle__text">
              Kích hoạt sử dụng ngay (Hiển thị công khai để CLB đặt lịch)
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={values.isActive}
              className={`admin-data-toggle__switch admin-data-toggle__switch--facility${values.isActive ? ' admin-data-toggle__switch--on' : ''}`}
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
              Hủy bỏ
            </button>
            <button type="submit" className="admin-data-btn-add" disabled={submitting}>
              <IconSave />
              {submitting ? 'Đang lưu...' : 'Xác nhận lưu'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AdminFacilityResourceModal;
