import React, { useEffect, useMemo, useState } from 'react';
import {
  CLUB_MODERATION_REASONS,
  canClubSubmitModeration,
  isAdminModerationPending,
  isIcpdpModerationPending
} from '../../constants/clubEventModeration';
import { MODERATION_ACTION_LABELS } from '../../constants/eventModeration';
import { SCHOOL_EVENT_STATUS_LABELS } from '../../constants/eventWorkflow';
import { requestClubEventModeration } from '../../utils/api';

const EventPostponeCancelPanel = ({ event, eventId, showToast, onEventUpdated }) => {
  const [action, setAction] = useState('postpone');
  const [reasonCategory, setReasonCategory] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (action === 'cancel' && reasonCategory === 'weather') {
      setReasonCategory('');
    }
  }, [action, reasonCategory]);

  const selectedReason = useMemo(
    () => CLUB_MODERATION_REASONS.find((r) => r.value === reasonCategory),
    [reasonCategory]
  );

  const isWeatherPostpone = action === 'postpone' && reasonCategory === 'weather';
  const canSubmit = canClubSubmitModeration(event);
  const icpdpPending = isIcpdpModerationPending(event);
  const adminPending = isAdminModerationPending(event);
  const isPostponed = event?.eventState === 'postponed';
  const isCancelled = event?.statusKey === 'cancelled';

  const statusLabel = (key) => SCHOOL_EVENT_STATUS_LABELS[key] || key;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reasonCategory) {
      showToast?.('Vui lòng chọn lý do.', 'error');
      return;
    }
    if (!content.trim()) {
      showToast?.('Vui lòng nhập nội dung chi tiết.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const data = await requestClubEventModeration(eventId, {
        action,
        reasonCategory,
        content: content.trim()
      });
      showToast?.(data.message || 'Đã gửi yêu cầu.', 'success');
      onEventUpdated?.(data.event);
      setContent('');
      if (!isWeatherPostpone) {
        setReasonCategory('');
      }
    } catch (err) {
      showToast?.(err.message || 'Gửi yêu cầu thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ev-moderation-panel">
      {isPostponed && (
        <div className="ev-moderation-banner ev-moderation-banner--info" role="status">
          <strong>Sự kiện đang hoãn</strong>
          {event.postponeIsWeather && <span className="ev-moderation-tag">Thời tiết</span>}
          <p>{event.postponeReason || 'Không có mô tả.'}</p>
        </div>
      )}

      {isCancelled && (
        <div className="ev-moderation-banner ev-moderation-banner--danger" role="status">
          <strong>Sự kiện đã bị hủy</strong>
          {event.moderationReason && <p>{event.moderationReason}</p>}
        </div>
      )}

      {icpdpPending && (
        <div className="ev-moderation-banner ev-moderation-banner--pending" role="status">
          <strong>Đang chờ IC-PDP duyệt</strong>
          <p>
            Yêu cầu{' '}
            <strong>{MODERATION_ACTION_LABELS[event.moderationAction] || 'điều phối'}</strong>
            {event.moderationReason ? `: ${event.moderationReason}` : '.'}
          </p>
          <p className="ev-moderation-banner__hint">
            Sau khi IC-PDP duyệt, yêu cầu sẽ chuyển sang Admin ({statusLabel(event.statusKey)}).
          </p>
        </div>
      )}

      {adminPending && (
        <div className="ev-moderation-banner ev-moderation-banner--pending" role="status">
          <strong>IC-PDP đã duyệt — đang chờ Admin</strong>
          <p>
            Yêu cầu{' '}
            <strong>{MODERATION_ACTION_LABELS[event.moderationAction] || 'điều phối'}</strong>
            {event.moderationReason ? `: ${event.moderationReason}` : '.'}
          </p>
          {event.icpdpNote && (
            <p className="ev-moderation-banner__hint">Ghi chú IC-PDP: {event.icpdpNote}</p>
          )}
        </div>
      )}

      {event?.rejectionReason && !icpdpPending && !adminPending && !canSubmit && (
        <div className="ev-moderation-banner ev-moderation-banner--danger" role="status">
          <strong>Yêu cầu bị từ chối</strong>
          <p>{event.rejectionReason}</p>
        </div>
      )}

      {canSubmit && (
        <section className="ev-moderation-section">
          <h3 className="ev-overview-title">Gửi yêu cầu hoãn / hủy sự kiện</h3>
          <p className="ev-cancel-hint">
            Yêu cầu sẽ được IC-PDP xem xét trước, sau đó chuyển Admin phê duyệt. Riêng hoãn do thời tiết
            được áp dụng ngay, không cần duyệt.
          </p>

          <form className="ev-moderation-form" onSubmit={handleSubmit}>
            <fieldset className="ev-moderation-fieldset">
              <legend className="ev-moderation-label">Loại yêu cầu</legend>
              <div className="ev-moderation-actions">
                <label className={`ev-moderation-radio${action === 'postpone' ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="moderation-action"
                    value="postpone"
                    checked={action === 'postpone'}
                    onChange={() => setAction('postpone')}
                  />
                  Hoãn sự kiện
                </label>
                <label
                  className={`ev-moderation-radio ev-moderation-radio--danger${
                    action === 'cancel' ? ' is-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="moderation-action"
                    value="cancel"
                    checked={action === 'cancel'}
                    onChange={() => setAction('cancel')}
                  />
                  Hủy sự kiện
                </label>
              </div>
            </fieldset>

            <fieldset className="ev-moderation-fieldset">
              <legend className="ev-moderation-label">Lý do</legend>
              <div className="ev-moderation-reasons" role="radiogroup" aria-label="Lý do hoãn hoặc hủy">
                {CLUB_MODERATION_REASONS.map((r) => {
                  const disabled = action === 'cancel' && r.noApproval;
                  const labelText =
                    r.noApproval && action === 'postpone'
                      ? `${r.label} (không cần duyệt)`
                      : r.label;
                  return (
                    <label
                      key={r.value}
                      className={`ev-moderation-radio${
                        reasonCategory === r.value ? ' is-active' : ''
                      }${disabled ? ' is-disabled' : ''}`}
                    >
                      <input
                        type="radio"
                        name="moderation-reason"
                        value={r.value}
                        checked={reasonCategory === r.value}
                        disabled={disabled}
                        onChange={() => setReasonCategory(r.value)}
                      />
                      {labelText}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="ev-moderation-field">
              <label className="ev-moderation-label" htmlFor="ev-mod-content">
                Nội dung chi tiết
              </label>
              <textarea
                id="ev-mod-content"
                className="ev-moderation-textarea"
                rows={4}
                placeholder="Mô tả cụ thể lý do hoãn/hủy, thông tin liên hệ hoặc kế hoạch dự phòng..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {isWeatherPostpone && (
              <p className="ev-moderation-note ev-moderation-note--success">
                Hoãn do thời tiết sẽ được áp dụng ngay sau khi gửi, không cần IC-PDP hay Admin duyệt.
              </p>
            )}

            {!isWeatherPostpone && reasonCategory && (
              <p className="ev-moderation-note">
                Sau khi gửi, yêu cầu chờ IC-PDP duyệt rồi chuyển Admin phê duyệt
                {selectedReason ? ` (${selectedReason.label}).` : '.'}
              </p>
            )}

            <div className="ev-moderation-form-actions">
              <button
                type="submit"
                className={`ev-btn-primary${action === 'cancel' ? ' ev-btn-danger' : ''}`}
                disabled={submitting}
              >
                {submitting
                  ? 'Đang gửi...'
                  : isWeatherPostpone
                    ? 'Xác nhận hoãn (thời tiết)'
                    : action === 'cancel'
                      ? 'Gửi yêu cầu hủy'
                      : 'Gửi yêu cầu hoãn'}
              </button>
            </div>
          </form>
        </section>
      )}

      {!canSubmit && !isPostponed && !isCancelled && !icpdpPending && !adminPending && (
        <p className="ev-panel-empty-cell">
          Chỉ có thể gửi yêu cầu hoãn/hủy khi sự kiện đã được duyệt và đang mở đăng ký hoặc diễn ra.
        </p>
      )}
    </div>
  );
};

export default EventPostponeCancelPanel;
