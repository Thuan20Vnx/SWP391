import React from 'react';
import BentoStarRating from './BentoStarRating';

const BentoCardButton = ({ cardKey, activeKey, onClick, children, className = '' }) => (
  <button
    type="button"
    className={`ev-bento-card ev-bento-card--interactive${activeKey === cardKey ? ' ev-bento-card--active' : ''} ${className}`.trim()}
    onClick={() => onClick?.(cardKey)}
    aria-pressed={activeKey === cardKey}
  >
    {children}
  </button>
);

const EventBentoStatsGrid = ({
  pendingMode = false,
  statusMeta,
  eventData,
  pendingLocationLabel,
  pendingCategoryLabel,
  eventStartLabel,
  eventEndLabel,
  registrationProgress,
  checkinProgress,
  ratingStats,
  reachDelta,
  reachDeltaLabel,
  reachDeltaTone,
  activeCard,
  onCardClick,
}) => {
  if (pendingMode) {
    return (
      <div className="ev-bento-grid ev-bento-grid--pending">
        <div className="ev-bento-card ev-bento-card--pending">
          <div className="ev-bento-card-header">
            <h3>TRẠNG THÁI DUYỆT</h3>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor" /></svg>
          </div>
          <div className="ev-bento-value">
            <span className="ev-bento-num ev-bento-num--text">{statusMeta.label}</span>
          </div>
          <p className="ev-bento-desc">Đề xuất đang trong hàng đợi IC-PDP</p>
        </div>

        <div className="ev-bento-card ev-bento-card--pending">
          <div className="ev-bento-card-header">
            <h3>SỨC CHỨA DỰ KIẾN</h3>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#f26f21"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor" /></svg>
          </div>
          <div className="ev-bento-value ev-bento-value--metric">
            <span className="ev-bento-num">{eventData?.capacity || 0}</span>
            <span className="ev-bento-total">chỗ</span>
          </div>
          <p className="ev-bento-desc">Quy mô tham gia trong đề xuất</p>
        </div>

        <div className="ev-bento-card ev-bento-card--pending">
          <div className="ev-bento-card-header">
            <h3>ĐỊA ĐIỂM DỰ KIẾN</h3>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#64748b" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" /></svg>
          </div>
          <div className="ev-bento-value">
            <span className="ev-bento-num ev-bento-num--sm" title={pendingLocationLabel}>
              {pendingLocationLabel}
            </span>
          </div>
          <p className="ev-bento-desc">Chủ đề: {pendingCategoryLabel}</p>
        </div>

        <div className="ev-bento-card ev-bento-card--pending">
          <div className="ev-bento-card-header">
            <h3>THỜI GIAN DIỄN RA</h3>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#334155"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" fill="currentColor" /></svg>
          </div>
          <div className="ev-bento-value">
            <span className="ev-bento-num ev-bento-num--sm">{eventStartLabel}</span>
          </div>
          <p className="ev-bento-desc">
            {eventEndLabel ? `Kết thúc: ${eventEndLabel}` : 'Chưa có thời gian kết thúc'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ev-bento-grid">
      <BentoCardButton cardKey="registration" activeKey={activeCard} onClick={onCardClick}>
        <div className="ev-bento-card-header">
          <h3>LƯỢT ĐĂNG KÝ VÉ</h3>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#f26f21"><path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.46V6H4v2.54A3.996 3.996 0 0 0 4 15.46V18h16v-2.54A3.996 3.996 0 0 0 20 8.54zM11 15h2v2h-2zm0-4h2v2h-2zm0-4h2v2h-2z" /></svg>
        </div>
        <div className="ev-bento-value">
          <span className="ev-bento-num">{eventData?.registeredCount || 0}</span>
          <span className="ev-bento-total">/ {eventData ? eventData.capacity : '...'}</span>
        </div>
        <div className="ev-bento-progress-bar">
          <div
            className={`ev-bento-progress-fill ev-bento-progress-fill--${registrationProgress.tone}`}
            style={{ width: `${registrationProgress.pct}%` }}
          />
        </div>
        <p className="ev-bento-desc">{registrationProgress.label}</p>
      </BentoCardButton>

      <BentoCardButton cardKey="checkin" activeKey={activeCard} onClick={onCardClick}>
        <div className="ev-bento-card-header">
          <h3>ĐÃ CHECK-IN</h3>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#334155"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM10.47 14.86l-2.12-2.12a.996.996 0 1 0-1.41 1.41l2.83 2.83c.39.39 1.02.39 1.41 0l5.66-5.66a.996.996 0 0 0-1.41-1.41l-4.96 4.95z" /></svg>
        </div>
        <div className="ev-bento-value">
          <span className="ev-bento-num">{eventData?.checkinCount || 0}</span>
          <span className="ev-bento-total">/ {eventData?.registeredCount || 0} sinh viên</span>
        </div>
        <div className="ev-bento-progress-bar ev-bento-progress-bar--checkin">
          <div
            className={`ev-bento-progress-fill ev-bento-progress-fill--checkin-${checkinProgress.tone}`}
            style={{ width: `${checkinProgress.pct}%` }}
          />
        </div>
        <p className="ev-bento-desc">{checkinProgress.label}</p>
      </BentoCardButton>

      <BentoCardButton cardKey="rating" activeKey={activeCard} onClick={onCardClick}>
        <div className="ev-bento-card-header">
          <h3>ĐÁNH GIÁ</h3>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#eab308"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
        </div>
        <div className="ev-bento-value">
          <span className="ev-bento-num">{ratingStats.label}</span>
          <BentoStarRating value={ratingStats.value} />
        </div>
        <p className="ev-bento-desc ev-bento-desc--spaced">
          {ratingStats.count > 0
            ? `Từ ${ratingStats.count} lượt phản hồi`
            : 'Chưa có lượt phản hồi'}
        </p>
      </BentoCardButton>

      <BentoCardButton cardKey="reach" activeKey={activeCard} onClick={onCardClick}>
        <div className="ev-bento-card-header">
          <h3>LƯỢT TIẾP CẬN</h3>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#334155"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
        </div>
        <div className="ev-bento-value">
          <span className="ev-bento-num">{eventData?.reach || 0}</span>
        </div>
        <p className={`ev-bento-desc ev-bento-desc--spaced ev-bento-desc--delta ev-bento-desc--delta-${reachDeltaTone}`}>
          {reachDelta > 0 && (
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" fill="currentColor" />
            </svg>
          )}
          {reachDelta < 0 && (
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" fill="currentColor" />
            </svg>
          )}
          <span className="ev-bento-delta-value">{reachDeltaLabel}</span> so với tuần trước
        </p>
      </BentoCardButton>
    </div>
  );
};

export default EventBentoStatsGrid;
