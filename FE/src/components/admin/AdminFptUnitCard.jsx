import React from 'react';
import { FPT_TYPE_META } from '../../data/adminFptSystemData';

const formatMembers = (count) => {
  if (count == null) return null;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.', ',')}K`;
  return String(count);
};

const AdminFptUnitCard = ({ unit, onDetail, onApprove }) => {
  const meta = FPT_TYPE_META[unit.type] || FPT_TYPE_META.clb;
  const members = unit.type === 'clb' ? formatMembers(unit.memberCount) : null;
  const isPartner = unit.type === 'partner';

  return (
    <article className={`admin-fpt-unit-card${isPartner ? ' admin-fpt-unit-card--partner' : ''}`}>
      <div className="admin-fpt-unit-card__media">
        {unit.coverImage ? (
          <img src={unit.coverImage} alt="" className="admin-fpt-unit-card__cover" />
        ) : (
          <div
            className="admin-fpt-unit-card__cover admin-fpt-unit-card__cover--fallback"
            style={{ backgroundColor: unit.logoColor || meta.accent }}
          >
            <span>{unit.logoText || unit.name?.slice(0, 2)?.toUpperCase()}</span>
          </div>
        )}
        <span className={`admin-fpt-unit-card__badge ${meta.badgeClass}`}>{meta.label}</span>
      </div>

      <div className="admin-fpt-unit-card__body">
        <div className="admin-fpt-unit-card__head">
          <h3>{unit.name}</h3>
          {unit.statusLabel ? (
            <span className={`admin-fpt-unit-card__status admin-fpt-unit-card__status--${unit.status || 'approved'}`}>
              {unit.statusLabel}
            </span>
          ) : members != null ? (
            <span className="admin-fpt-unit-card__members">{members} thành viên</span>
          ) : null}
        </div>
        {unit.subtitle && <p className="admin-fpt-unit-card__subtitle">{unit.subtitle}</p>}
        <p className="admin-fpt-unit-card__desc">{unit.description}</p>

        <div className="admin-fpt-unit-card__actions admin-fpt-unit-card__actions--dual">
          <button
            type="button"
            className="admin-fpt-unit-card__btn admin-fpt-unit-card__btn--primary"
            onClick={() => onDetail?.(unit)}
          >
            Chi tiết
          </button>
          <button
            type="button"
            className="admin-fpt-unit-card__btn admin-fpt-unit-card__btn--ghost"
            onClick={() => onApprove?.(unit)}
          >
            Quản lý sự kiện
          </button>
        </div>
      </div>
    </article>
  );
};

export default AdminFptUnitCard;
