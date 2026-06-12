import React, { useEffect, useMemo } from 'react';
import {
  FACILITY_STATUS,
  getFacilityEquipmentLabels,
  getResourceTypeLabel,
} from '../../data/adminDataMaintenanceData';
import '../../styles/admin-data-fields.css';

const DetailRow = ({ label, value, fullWidth, children }) => (
  <div className={`admin-data-detail__item${fullWidth ? ' admin-data-detail__item--full' : ''}`}>
    <span className="admin-data-detail__label">{label}</span>
    {children ?? <span className="admin-data-detail__value">{value ?? '—'}</span>}
  </div>
);

const AdminCoreDataDetailModal = ({ open, activeTab, item, onClose, onEdit }) => {
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

  const content = useMemo(() => {
    if (!item) return null;

    if (activeTab === 'facilities') {
      const statusMeta = FACILITY_STATUS[item.status] || FACILITY_STATUS.ready;
      const equipmentLabels = getFacilityEquipmentLabels(item.equipment);
      const isActive = item.isActive !== false && item.status !== 'maintenance';

      return {
        title: item.name,
        subtitle: getResourceTypeLabel(item.resourceType),
        rows: (
          <>
            <DetailRow label="Loại tài nguyên" value={getResourceTypeLabel(item.resourceType)} />
            <DetailRow
              label="Sức chứa tối đa"
              value={`${Number(item.capacity || 0).toLocaleString('vi-VN')} người`}
            />
            <DetailRow label="Vị trí tòa nhà" value={item.building} />
            <DetailRow label="Trạng thái vận hành">
              <span className={`admin-data-status admin-data-status--${statusMeta.tone}`}>
                <span className="admin-data-status__dot" aria-hidden="true" />
                {statusMeta.label}
              </span>
            </DetailRow>
            <DetailRow label="Đặt lịch CLB" value={isActive ? 'Đang hiển thị công khai' : 'Tạm ẩn — không cho đặt lịch'} />
            <DetailRow label="Mã hệ thống" value={item.id} />
            <DetailRow label="Trang thiết bị sẵn có" fullWidth>
              {equipmentLabels.length > 0 ? (
                <ul className="admin-data-detail__tags">
                  {equipmentLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              ) : (
                <span className="admin-data-detail__muted">Chưa khai báo thiết bị</span>
              )}
            </DetailRow>
          </>
        ),
      };
    }

    if (activeTab === 'categories') {
      return {
        title: item.name,
        subtitle: item.code || 'Danh mục sự kiện',
        rows: (
          <>
            <DetailRow label="Mã danh mục" value={item.code} />
            <DetailRow label="Tên danh mục sự kiện" value={item.name} />
            <DetailRow
              label="Số sự kiện đã tổ chức"
              value={`${(item.eventCount ?? 0).toLocaleString('vi-VN')} sự kiện`}
            />
            <DetailRow
              label="Trạng thái hiển thị"
              value={item.active ? 'Đang dùng' : 'Tạm ẩn'}
            />
            <DetailRow label="Mô tả khái quát" fullWidth value={item.description || '—'} />
            <DetailRow label="Mã hệ thống" value={item.id} />
          </>
        ),
      };
    }

    return {
      title: item.name,
      subtitle: item.code,
      rows: (
        <>
          <DetailRow label="Mã CLB" value={item.code} />
          <DetailRow label="Tên câu lạc bộ" value={item.name} />
          <DetailRow label="Lĩnh vực hoạt động" value={item.field || '—'} />
          <DetailRow label="Chủ nhiệm hiện tại" value={item.president || '—'} />
          <DetailRow
            label="Trạng thái"
            value={item.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
          />
          <DetailRow label="Mã hệ thống" value={item.id} />
        </>
      ),
    };
  }, [activeTab, item]);

  if (!open || !item || !content) return null;

  const tabTitles = {
    facilities: 'Chi tiết phòng / hội trường',
    categories: 'Chi tiết danh mục',
    clubs: 'Chi tiết CLB gốc',
  };

  return (
    <div className="admin-acc-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-acc-modal admin-data-modal admin-data-detail-modal"
        role="dialog"
        aria-labelledby="admin-data-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-data-modal__header">
          <div className="admin-data-modal__head-text">
            <p className="admin-data-detail__eyebrow">{tabTitles[activeTab]}</p>
            <h2 id="admin-data-detail-title" className="admin-data-modal__title">
              {content.title}
            </h2>
            <p className="admin-data-modal__subtitle">{content.subtitle}</p>
          </div>
          <button type="button" className="admin-data-modal__close" onClick={onClose} aria-label="Đóng">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="admin-data-detail__grid">{content.rows}</div>

        <footer className="admin-data-detail__footer">
          <button type="button" className="admin-acc-btn admin-acc-btn--ghost" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="admin-data-btn-add"
            onClick={() => {
              onClose();
              onEdit(item);
            }}
          >
            Chỉnh sửa
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AdminCoreDataDetailModal;
