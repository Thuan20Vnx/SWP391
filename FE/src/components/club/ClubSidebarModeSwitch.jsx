import React from 'react';
import { CLUB_SIDEBAR_MODE } from './clubNavConfig';

const ClubSidebarModeSwitch = ({ mode, onModeChange }) => (
  <div className="club-sidebar-mode-switch" role="tablist" aria-label="Chế độ sidebar CLB">
    <button
      type="button"
      role="tab"
      aria-selected={mode === CLUB_SIDEBAR_MODE.MANAGE}
      className={`club-sidebar-mode-btn${
        mode === CLUB_SIDEBAR_MODE.MANAGE ? ' club-sidebar-mode-btn--active' : ''
      }`}
      onClick={() => onModeChange(CLUB_SIDEBAR_MODE.MANAGE)}
    >
      Quản lý CLB
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === CLUB_SIDEBAR_MODE.PARTICIPATE}
      className={`club-sidebar-mode-btn${
        mode === CLUB_SIDEBAR_MODE.PARTICIPATE ? ' club-sidebar-mode-btn--active' : ''
      }`}
      onClick={() => onModeChange(CLUB_SIDEBAR_MODE.PARTICIPATE)}
    >
      Tham gia sự kiện
    </button>
  </div>
);

export default ClubSidebarModeSwitch;
