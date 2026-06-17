import React, { useEffect, useMemo } from 'react';
import {
  FACILITY_STATUS,
  getFacilityEquipmentLabels,
  getFacilityStatusLabel,
  getResourceTypeLabel,
} from '../../data/adminDataMaintenanceData';
import { useTranslation } from '../../i18n/I18nContext';
import '../../styles/admin-data-fields.css';

const DetailRow = ({ label, value, fullWidth, children }) => (
  <div className={`admin-data-detail__item${fullWidth ? ' admin-data-detail__item--full' : ''}`}>
    <span className="admin-data-detail__label">{label}</span>
    {children ?? <span className="admin-data-detail__value">{value ?? '—'}</span>}
  </div>
);

const AdminCoreDataDetailModal = ({ open, activeTab, item, onClose, onEdit }) => {
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

  const content = useMemo(() => {
    if (!item) return null;
    const empty = t('admin.common.empty');

    if (activeTab === 'facilities') {
      const statusMeta = FACILITY_STATUS[item.status] || FACILITY_STATUS.ready;
      const equipmentLabels = getFacilityEquipmentLabels(item.equipment, t);
      const isActive = item.isActive !== false && item.status !== 'maintenance';

      return {
        title: item.name,
        subtitle: getResourceTypeLabel(item.resourceType, t),
        rows: (
          <>
            <DetailRow
              label={t('admin.dataMaintenance.detail.resourceType')}
              value={getResourceTypeLabel(item.resourceType, t)}
            />
            <DetailRow
              label={t('admin.dataMaintenance.detail.maxCapacity')}
              value={t('admin.dataMaintenance.capacityPeople', {
                count: Number(item.capacity || 0).toLocaleString('vi-VN'),
              })}
            />
            <DetailRow label={t('admin.dataMaintenance.detail.buildingLocation')} value={item.building} />
            <DetailRow label={t('admin.dataMaintenance.detail.operatingStatus')}>
              <span className={`admin-data-status admin-data-status--${statusMeta.tone}`}>
                <span className="admin-data-status__dot" aria-hidden="true" />
                {getFacilityStatusLabel(item.status, t)}
              </span>
            </DetailRow>
            <DetailRow
              label={t('admin.dataMaintenance.detail.clubBooking')}
              value={
                isActive
                  ? t('admin.dataMaintenance.detail.bookingPublic')
                  : t('admin.dataMaintenance.detail.bookingHidden')
              }
            />
            <DetailRow label={t('admin.dataMaintenance.detail.systemId')} value={item.id} />
            <DetailRow label={t('admin.dataMaintenance.detail.equipment')} fullWidth>
              {equipmentLabels.length > 0 ? (
                <ul className="admin-data-detail__tags">
                  {equipmentLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              ) : (
                <span className="admin-data-detail__muted">
                  {t('admin.dataMaintenance.detail.noEquipment')}
                </span>
              )}
            </DetailRow>
          </>
        ),
      };
    }

    if (activeTab === 'categories') {
      return {
        title: item.name,
        subtitle: item.code || t('admin.dataMaintenance.detail.categoryFallback'),
        rows: (
          <>
            <DetailRow label={t('admin.dataMaintenance.detail.categoryCode')} value={item.code} />
            <DetailRow label={t('admin.dataMaintenance.detail.categoryName')} value={item.name} />
            <DetailRow
              label={t('admin.dataMaintenance.detail.eventsHeld')}
              value={t('admin.dataMaintenance.eventCount', {
                count: (item.eventCount ?? 0).toLocaleString('vi-VN'),
              })}
            />
            <DetailRow
              label={t('admin.dataMaintenance.detail.displayStatus')}
              value={
                item.active
                  ? t('admin.dataMaintenance.detail.statusActive')
                  : t('admin.dataMaintenance.detail.statusHidden')
              }
            />
            <DetailRow
              label={t('admin.dataMaintenance.detail.overviewDesc')}
              fullWidth
              value={item.description || empty}
            />
            <DetailRow label={t('admin.dataMaintenance.detail.systemId')} value={item.id} />
          </>
        ),
      };
    }

    return {
      title: item.name,
      subtitle: item.code,
      rows: (
        <>
          <DetailRow label={t('admin.dataMaintenance.detail.clubCode')} value={item.code} />
          <DetailRow label={t('admin.dataMaintenance.detail.clubName')} value={item.name} />
          <DetailRow label={t('admin.dataMaintenance.detail.clubField')} value={item.field || empty} />
          <DetailRow label={t('admin.dataMaintenance.detail.president')} value={item.president || empty} />
          <DetailRow
            label={t('admin.dataMaintenance.table.status')}
            value={
              item.status === 'active'
                ? t('admin.dataMaintenance.detail.clubStatusActive')
                : t('admin.dataMaintenance.detail.clubStatusPaused')
            }
          />
          <DetailRow label={t('admin.dataMaintenance.detail.systemId')} value={item.id} />
        </>
      ),
    };
  }, [activeTab, item, t]);

  if (!open || !item || !content) return null;

  const tabTitles = {
    facilities: t('admin.dataMaintenance.detail.facilities'),
    categories: t('admin.dataMaintenance.detail.categories'),
    clubs: t('admin.dataMaintenance.detail.clubs'),
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
          <button
            type="button"
            className="admin-data-modal__close"
            onClick={onClose}
            aria-label={t('admin.common.close')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="admin-data-detail__grid">{content.rows}</div>

        <footer className="admin-data-detail__footer">
          <button type="button" className="admin-acc-btn admin-acc-btn--ghost" onClick={onClose}>
            {t('admin.common.close')}
          </button>
          <button
            type="button"
            className="admin-data-btn-add"
            onClick={() => {
              onClose();
              onEdit(item);
            }}
          >
            {t('admin.common.edit')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AdminCoreDataDetailModal;
