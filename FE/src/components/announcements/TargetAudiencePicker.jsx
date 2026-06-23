import React, { useEffect } from 'react';
import {
  ANNOUNCEMENT_TARGET_ALL,
  getAllowedTargetsForPublisher,
  normalizeTargetsForPublisher,
  toggleTargetSelection,
} from '../../constants/announcementTargets';
import { useTranslation } from '../../i18n/I18nContext';

const TARGET_KEYS = {
  all: 'announce.target.all',
  guest: 'announce.target.guest',
  student: 'announce.target.student',
  club_manager: 'announce.target.club_manager',
  partner: 'announce.target.partner',
  icpdp: 'announce.target.icpdp',
  ctsv: 'announce.target.ctsv',
  admin: 'announce.target.admin',
};

const TargetAudiencePicker = ({ portalRole, value = [ANNOUNCEMENT_TARGET_ALL], onChange, disabled }) => {
  const { t } = useTranslation();
  const allowed = getAllowedTargetsForPublisher(portalRole);
  const isPartnerOnlyCtsv = portalRole === 'partner';
  const displayValue = normalizeTargetsForPublisher(portalRole, value);

  useEffect(() => {
    if (isPartnerOnlyCtsv && !value?.includes('ctsv')) {
      onChange?.(['ctsv']);
    }
  }, [isPartnerOnlyCtsv, value, onChange]);

  const handleToggle = (target) => {
    if (disabled || isPartnerOnlyCtsv) return;
    onChange(toggleTargetSelection(displayValue, target));
  };

  return (
    <div className="announce-target-picker">
      <span className="announce-target-picker__label">{t('announce.target.label')}</span>
      <div className="announce-target-picker__chips" role="group" aria-label={t('announce.target.label')}>
        {allowed.map((target) => {
          const active = displayValue.includes(target);
          return (
            <button
              key={target}
              type="button"
              className={`announce-target-chip${active ? ' announce-target-chip--active' : ''}`}
              aria-pressed={active}
              disabled={disabled || isPartnerOnlyCtsv}
              onClick={() => handleToggle(target)}
            >
              {t(TARGET_KEYS[target] || target)}
            </button>
          );
        })}
      </div>
      <p className="announce-target-picker__hint">
        {isPartnerOnlyCtsv ? t('announce.target.hintPartner') : t('announce.target.hintDefault')}
      </p>
    </div>
  );
};

export default TargetAudiencePicker;
