import React from 'react';
import {
  ANNOUNCEMENT_TARGET_ALL,
  ANNOUNCEMENT_TARGET_LABELS,
  getAllowedTargetsForPublisher,
  toggleTargetSelection
} from '../../constants/announcementTargets';

const TargetAudiencePicker = ({ portalRole, value = [ANNOUNCEMENT_TARGET_ALL], onChange, disabled }) => {
  const allowed = getAllowedTargetsForPublisher(portalRole);

  const handleToggle = (target) => {
    if (disabled) return;
    onChange(toggleTargetSelection(value, target));
  };

  return (
    <div className="announce-target-picker">
      <span className="announce-target-picker__label">Đối tượng nhận</span>
      <div className="announce-target-picker__chips" role="group" aria-label="Chọn đối tượng nhận thông báo">
        {allowed.map((target) => {
          const active = value.includes(target);
          return (
            <button
              key={target}
              type="button"
              className={`announce-target-chip${active ? ' announce-target-chip--active' : ''}`}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => handleToggle(target)}
            >
              {ANNOUNCEMENT_TARGET_LABELS[target] || target}
            </button>
          );
        })}
      </div>
      <p className="announce-target-picker__hint">
        Chọn một hoặc nhiều nhóm. Chọn &quot;Tất cả&quot; để gửi toàn hệ thống.
      </p>
    </div>
  );
};

export default TargetAudiencePicker;
