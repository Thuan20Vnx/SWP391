import React from 'react';
import { EVENT_FORM_ROLE_CONFIG } from '../../utils/eventFormState';

const STEPS = ['THÔNG TIN CHUNG', 'NỘI DUNG', 'THỜI GIAN & ĐỊA ĐIỂM', 'GỬI DUYỆT'];

const SkLine = ({ className = '' }) => (
  <div className={`clb-form-skeleton__line ${className}`.trim()} aria-hidden="true" />
);

const EventProposalFormSkeleton = ({
  role = 'club',
  isEditMode = false,
  onCancel,
}) => {
  const config = EVENT_FORM_ROLE_CONFIG[role] || EVENT_FORM_ROLE_CONFIG.club;
  const title = isEditMode ? config.titleEdit : config.titleCreate;
  const subtitle = isEditMode ? config.subtitleEdit : config.subtitleCreate;

  return (
    <div
      className="clb-create-view event-proposal-form event-proposal-form--loading"
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        background: '#fff',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}
      aria-busy="true"
      aria-live="polite"
      aria-label="Đang tải thông tin sự kiện"
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="clb-form-skeleton__back"
            aria-label="Quay lại"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
            </svg>
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h2 className="clb-modal-title" style={{ margin: 0 }}>
            {title}
          </h2>
          <p className="clb-modal-subtitle" style={{ margin: '4px 0 0 0' }}>
            {subtitle}
          </p>
          <p className="clb-form-skeleton__hint">Đang tải dữ liệu sự kiện...</p>
        </div>
      </div>

      <div className="clb-steps clb-form-skeleton__steps" aria-hidden="true">
        {STEPS.map((label, i) => (
          <div key={label} className={`clb-step ${i === 0 ? 'active' : ''}`}>
            <div className="clb-step-circle">{i + 1}</div>
            <span className="clb-step-label">{label}</span>
            {i < 3 && <div className="clb-step-line" />}
          </div>
        ))}
      </div>

      <div className="clb-form-skeleton">
        <div className="clb-form-row">
          <div className="clb-form-group">
            <SkLine className="clb-form-skeleton__label" />
            <SkLine />
          </div>
          <div className="clb-form-group">
            <SkLine className="clb-form-skeleton__label" />
            <SkLine />
          </div>
        </div>
        <div className="clb-form-group">
          <SkLine className="clb-form-skeleton__label" />
          <SkLine className="clb-form-skeleton__banner" />
        </div>
        <div className="clb-form-group">
          <SkLine className="clb-form-skeleton__label" />
          <SkLine />
        </div>
        <div className="clb-form-skeleton__actions">
          <SkLine className="clb-form-skeleton__btn" />
          <SkLine className="clb-form-skeleton__btn clb-form-skeleton__btn--primary" />
        </div>
      </div>
    </div>
  );
};

export default EventProposalFormSkeleton;
