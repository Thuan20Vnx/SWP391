import React, { useEffect } from 'react';
import {
  ANNOUNCEMENT_TARGET_ALL,
  ANNOUNCEMENT_TARGET_LABELS,
  getAllowedTargetsForPublisher,
  normalizeTargetsForPublisher,
  toggleTargetSelection
} from '../../constants/announcementTargets';

const TargetAudiencePicker = ({ portalRole, value = [ANNOUNCEMENT_TARGET_ALL], onChange, disabled }) => {
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
      <span className="announce-target-picker__label">Đối tượng nhận</span>
      <div className="announce-target-picker__chips" role="group" aria-label="Chọn đối tượng nhận thông báo">
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
              {ANNOUNCEMENT_TARGET_LABELS[target] || target}
            </button>
          );
        })}
      </div>
      <p className="announce-target-picker__hint">
        {isPartnerOnlyCtsv
          ? 'Đối tác chỉ gửi thông báo tới Phòng CTSV.'
          : 'Chọn một hoặc nhiều nhóm. Chọn "Tất cả" để gửi toàn hệ thống.'}
      </p>
    </div>
  );
};

export default TargetAudiencePicker;
