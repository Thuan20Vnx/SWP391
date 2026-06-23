import React from 'react';
import {
  NOTICE_CATEGORY_OPTIONS,
  normalizeNoticeCategory,
} from '../../constants/announcementNoticeCategories';
import { useTranslation } from '../../i18n/I18nContext';
import { resolveLabel } from '../../i18n/helpers';

const NoticeCategoryPicker = ({ value = 'info', onChange, disabled }) => {
  const { t } = useTranslation();
  const selected = normalizeNoticeCategory(value);

  return (
    <div className="announce-target-picker announce-notice-category-picker">
      <span className="announce-target-picker__label">{t('announce.categoryLabel')}</span>
      <div className="announce-target-picker__chips" role="radiogroup" aria-label={t('announce.categoryLabel')}>
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
              {resolveLabel(opt, t)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NoticeCategoryPicker;
