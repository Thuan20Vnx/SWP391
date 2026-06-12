import React from 'react';
import { FPT_TYPE_META, resolveFptTypeLabel } from '../../data/adminFptSystemData';
import { useTranslation } from '../../i18n/I18nContext';

const AdminFptDeptCard = ({ unit, onDetail, onManage }) => {
  const { t } = useTranslation();
  const badgeLabel = resolveFptTypeLabel(unit.type, t);

  return (
    <article className="admin-fpt-dept-card">
      <div className="admin-fpt-dept-card__media">
        <img src={unit.coverImage} alt="" className="admin-fpt-dept-card__cover" />
        <span className={`admin-fpt-dept-card__badge ${FPT_TYPE_META[unit.type]?.badgeClass || ''}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="admin-fpt-dept-card__body">
        <div className="admin-fpt-dept-card__head">
          <div>
            <h3>{unit.name}</h3>
            <p className="admin-fpt-dept-card__subtitle">{unit.subtitle}</p>
          </div>
          <div className="admin-fpt-dept-card__stat">
            <strong>{unit.staffCount ?? 0}</strong>
            <span>{t('admin.fpt.card.staff')}</span>
          </div>
        </div>

        <p className="admin-fpt-dept-card__desc">{unit.description}</p>

        <div className="admin-fpt-dept-card__actions admin-fpt-dept-card__actions--dual">
          <button
            type="button"
            className="admin-fpt-dept-card__btn admin-fpt-dept-card__btn--primary"
            onClick={() => onDetail?.(unit)}
          >
            {t('admin.fpt.card.detail')}
          </button>
          <button
            type="button"
            className="admin-fpt-dept-card__btn admin-fpt-dept-card__btn--ghost"
            onClick={() => onManage?.(unit)}
          >
            {unit.manageLabel}
          </button>
        </div>
      </div>
    </article>
  );
};

export default AdminFptDeptCard;
