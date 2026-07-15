import React from 'react';

/**
 * Chuyển chế độ sidebar Partner. Partner kế thừa Guest: ngoài cổng Đối tác
 * (khai báo công ty, yêu cầu tạo sự kiện) họ vẫn dùng được trải nghiệm khách
 * (tham gia/đăng ký sự kiện). Nút "Tham gia sự kiện" đưa về trang công khai `/`.
 */
const PartnerSidebarModeSwitch = ({ mode = 'partner', onModeChange }) => (
  <div className="club-sidebar-mode-switch partner-sidebar-mode-switch" role="tablist" aria-label="Chế độ sidebar đối tác">
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'partner'}
      className={`club-sidebar-mode-btn${mode === 'partner' ? ' club-sidebar-mode-btn--active' : ''}`}
      onClick={() => onModeChange('partner')}
    >
      Đối tác
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'participate'}
      className={`club-sidebar-mode-btn${mode === 'participate' ? ' club-sidebar-mode-btn--active' : ''}`}
      onClick={() => onModeChange('participate')}
    >
      Tham gia sự kiện
    </button>
  </div>
);

export default PartnerSidebarModeSwitch;
