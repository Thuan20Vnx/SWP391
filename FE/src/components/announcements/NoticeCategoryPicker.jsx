import React from 'react';
import {
  NOTICE_CATEGORY_OPTIONS,
  normalizeNoticeCategory,
} from '../../constants/announcementNoticeCategories';

const NoticeCategoryPicker = ({ value = 'info', onChange, disabled }) => {
  const selected = normalizeNoticeCategory(value);

  return (
    <div className="announce-target-picker announce-notice-category-picker">
      <span className="announce-target-picker__label">Doanh mục</span>
      <div className="announce-target-picker__chips" role="radiogroup" aria-label="Chọn doanh mục thông báo">
        {NOTICE_CATEGORY_OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`announce-target-chip announce-notice-category-chip announce-notice-category-chip--${opt.value}${active ? ' announce-target-chip--active' : ''}`}
              disabled={disabled}
              onClick={() => !disabled && onChange?.(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="announce-target-picker__hint">
        Phân loại mức độ: Thông tin thường, Cần xử lý, hoặc Khẩn.
      </p>
    </div>
  );
};

export default NoticeCategoryPicker;
