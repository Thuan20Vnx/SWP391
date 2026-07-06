import React from 'react';
import { isModerationPending, MODERATION_ACTION_LABELS } from '../../constants/eventModeration';
import { isSchoolEventPendingAdmin } from '../../constants/eventWorkflow';
import { getSchoolEventOrganizerMeta } from '../../utils/schoolEventOrganizer';

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const AdminSchoolEventActionsPanel = ({ event, busy = false, isModerationRequest = false, onApprove, onReject }) => {
  if (!event || event.source !== 'school') return null;

  const organizer = getSchoolEventOrganizerMeta(event);
  const moderationPending = isModerationPending(event);
  const submitPending = isSchoolEventPendingAdmin(event);
  const canAct = moderationPending || submitPending;

  if (!canAct) {
    return (
      <div className="admin-approval-panel admin-approval-panel--empty">
        <p>Không có yêu cầu nào đang chờ Admin xử lý trên sự kiện này.</p>
      </div>
    );
  }

  const actionLabel = moderationPending
    ? MODERATION_ACTION_LABELS[event.moderationAction] || 'Điều phối'
    : 'Phê duyệt đơn tổ chức';

  const senderUnitLabel = organizer.unitLabel;

  return (
    <div className="admin-approval-panel">
      <div className="admin-approval-panel__hero">
        <div className="admin-approval-panel__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v6h-2V7zm0 8h2v2h-2v-2z" />
          </svg>
        </div>
        <div className="admin-approval-panel__intro">
          <p className="admin-approval-panel__eyebrow">Admin · Phê duyệt yêu cầu</p>
          <h2 className="admin-approval-panel__title">{actionLabel}</h2>
          <p className="admin-approval-panel__lead">
            {moderationPending
              ? `${senderUnitLabel} đã gửi yêu cầu điều phối. Từ chối yêu cầu không đổi trạng thái sự kiện (ví dụ vẫn Mở đăng ký).`
              : `${organizer.sourceLine} — không qua bước duyệt nội bộ IC-PDP.`}
          </p>
        </div>
      </div>

      <div className="admin-approval-panel__grid">
        <div className="admin-approval-panel__cell">
          <dt>Trạng thái</dt>
          <dd>
            <span className="admin-approval-panel__badge admin-approval-panel__badge--pending">
              Chờ Admin xử lý
            </span>
          </dd>
        </div>

        <div className="admin-approval-panel__cell">
          <dt>Đơn vị tổ chức</dt>
          <dd>
            <span className={`admin-approval-panel__unit admin-approval-panel__unit--${organizer.organizerType}`}>
              {organizer.unitLine}
            </span>
          </dd>
        </div>

        {moderationPending && (
          <div className="admin-approval-panel__cell">
            <dt>Loại yêu cầu</dt>
            <dd>{actionLabel}</dd>
          </div>
        )}

        {(event.moderationRequestedByEmail || organizer.submitterEmail) && (
          <div className="admin-approval-panel__cell">
            <dt>{moderationPending ? 'Người gửi yêu cầu' : 'Người gửi đơn'}</dt>
            <dd>{event.moderationRequestedByEmail || organizer.submitterEmail || '—'}</dd>
          </div>
        )}

        {(event.moderationRequestedAt || organizer.submittedAt) && (
          <div className="admin-approval-panel__cell">
            <dt>Thời gian gửi</dt>
            <dd>{formatDateTime(event.moderationRequestedAt || organizer.submittedAt)}</dd>
          </div>
        )}

        {submitPending && !moderationPending && (
          <div className="admin-approval-panel__cell admin-approval-panel__cell--wide">
            <dt>Nguồn sự kiện</dt>
            <dd>
              {organizer.isIcpdp
                ? 'Sự kiện do IC-PDP khởi tạo (ngoài luồng timeline hoặc theo kế hoạch đơn vị). Admin là bước duyệt cuối.'
                : 'Sự kiện do CTSV khởi tạo (phát sinh hoặc theo kế hoạch đơn vị). Admin là bước duyệt cuối.'}
            </dd>
          </div>
        )}
      </div>

      {event.moderationReason?.trim() && (
        <div className="admin-approval-panel__reason">
          <span className="admin-approval-panel__reason-label">
            Lý do / ghi chú từ {senderUnitLabel}
          </span>
          <p>{event.moderationReason.trim()}</p>
        </div>
      )}

      <div className="admin-approval-panel__hint" role="note">
        <strong>Gợi ý xử lý</strong>
        <p>
          Sau khi duyệt, {senderUnitLabel} có thể tiếp tục xử lý theo quy trình đơn vị. Từ chối
          cần kèm lý do rõ ràng để bên gửi điều chỉnh hoặc liên hệ lại.
        </p>
      </div>

      <div className="admin-approval-panel__actions">
        <button
          type="button"
          className="ev-btn-primary"
          disabled={busy}
          onClick={onApprove}
        >
          {busy ? 'Đang xử lý…' : isModerationRequest ? 'Duyệt yêu cầu' : 'Phê duyệt'}
        </button>
        <button
          type="button"
          className="ev-btn-outline ev-btn-outline--danger"
          disabled={busy}
          onClick={onReject}
        >
          {isModerationRequest ? 'Từ chối yêu cầu' : 'Từ chối đơn'}
        </button>
      </div>
    </div>
  );
};

export default AdminSchoolEventActionsPanel;
