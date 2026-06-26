import React from 'react';
import { CLUB_MODERATION_REASONS } from '../../constants/clubEventModeration';
import { MODERATION_ACTION_LABELS } from '../../constants/eventModeration';
import { SCHOOL_EVENT_STATUS_LABELS } from '../../constants/eventWorkflow';
import { statusClass } from '../../utils/eventStatus';
import '../../styles/admin-dashboard.css';

const THUMB_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23f1ede9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23b0a090'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const reasonCategoryLabel = (value) =>
  CLUB_MODERATION_REASONS.find((r) => r.value === value)?.label || value || '—';

const ClubEventModerationReviewCard = ({ event, index = 0, footer = null }) => {
  const statusKey = event.statusKey || event.status;
  const statusText = SCHOOL_EVENT_STATUS_LABELS[statusKey] || event.status || '—';
  const actionLabel =
    MODERATION_ACTION_LABELS[event.moderationAction] ||
    (statusKey === 'pending_icpdp_postpone' || statusKey === 'pending_postpone'
      ? 'Hoãn sự kiện'
      : statusKey === 'pending_icpdp_delete' || statusKey === 'pending_delete'
        ? 'Xóa sự kiện'
        : statusKey === 'pending_icpdp_edit' || statusKey === 'pending_edit'
          ? 'Chỉnh sửa sự kiện'
          : 'Hủy sự kiện');

  return (
    <li className="admin-proposal-card admin-proposal-card--moderation">
      <div className="admin-proposal-card__head">
        <div className="admin-proposal-card__head-main">
          <span className="admin-proposal-card__index">#{index + 1}</span>
          <h2 className="admin-proposal-card__title">{event.title}</h2>
          <span className="adm-ev-plan-badge adm-ev-plan-badge--moderation">Yêu cầu {actionLabel.toLowerCase()}</span>
        </div>
        <span className={`status-pill ${statusClass(statusText, statusKey)}`}>{statusText}</span>
      </div>

      <div className="admin-proposal-card__body">
        <div className="admin-proposal-card__thumb-wrap">
          <img
            src={event.image || event.thumbnail || THUMB_FALLBACK}
            alt=""
            className="admin-proposal-card__thumb"
            onError={(e) => {
              e.target.src = THUMB_FALLBACK;
              e.target.onerror = null;
            }}
          />
        </div>

        <div className="admin-proposal-card__details">
          <dl className="admin-proposal-meta">
            <div className="admin-proposal-meta__row">
              <dt>Câu lạc bộ</dt>
              <dd>{event.clubName || '—'}</dd>
            </div>
            <div className="admin-proposal-meta__row">
              <dt>Loại yêu cầu</dt>
              <dd>{actionLabel}</dd>
            </div>
            <div className="admin-proposal-meta__row">
              <dt>Lý do</dt>
              <dd>{reasonCategoryLabel(event.moderationReasonCategory)}</dd>
            </div>
            <div className="admin-proposal-meta__row">
              <dt>Địa điểm</dt>
              <dd>{event.location || '—'}</dd>
            </div>
            <div className="admin-proposal-meta__row">
              <dt>Thời gian sự kiện</dt>
              <dd>
                {event.date || formatDateTime(event.startDate)}
                {event.time ? ` · ${event.time}` : ''}
              </dd>
            </div>
            {event.moderationRequestedByEmail && (
              <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                <dt>Người gửi</dt>
                <dd className="admin-proposal-meta__email">{event.moderationRequestedByEmail}</dd>
              </div>
            )}
            {event.moderationRequestedAt && (
              <div className="admin-proposal-meta__row">
                <dt>Gửi lúc</dt>
                <dd>{formatDateTime(event.moderationRequestedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {event.moderationReason?.trim() ? (
        <div className="admin-proposal-card__full">
          <div className="admin-fpt-unit-events__note admin-fpt-unit-events__note--moderation">
            <span className="admin-proposal-card__desc-label">Nội dung chi tiết</span>
            <p>{event.moderationReason}</p>
          </div>
        </div>
      ) : null}

      {footer ? <footer className="admin-proposal-card__footer">{footer}</footer> : null}
    </li>
  );
};

export default ClubEventModerationReviewCard;
