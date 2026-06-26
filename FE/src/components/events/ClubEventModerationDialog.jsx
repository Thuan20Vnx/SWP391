import React, { useEffect, useState } from 'react';
import { CLUB_MODERATION_REASONS } from '../../constants/clubEventModeration';
import { MODERATION_ACTION_LABELS } from '../../constants/eventModeration';
import { requestClubEventModeration } from '../../utils/api';

const ClubEventModerationDialog = ({
  open,
  eventId,
  action = 'edit',
  eventTitle = '',
  onClose,
  onSubmitted,
  showToast,
}) => {
  const [reasonCategory, setReasonCategory] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasonCategory('');
    setContent('');
  }, [open, action]);

  const actionLabel = MODERATION_ACTION_LABELS[action] || 'Yêu cầu';
  const hint =
    action === 'delete'
      ? 'Yêu cầu sẽ gửi IC-PDP xét duyệt trước, sau đó chuyển Admin phê duyệt. Sự kiện không bị xóa ngay.'
      : 'Yêu cầu sẽ gửi IC-PDP xét duyệt trước, sau đó chuyển Admin phê duyệt. Bạn chỉ chỉnh sửa được sau khi Admin duyệt.';

  if (!open) return null;

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
        content: content.trim(),
      });
      showToast?.(data.message || 'Đã gửi yêu cầu.', 'success');
      onSubmitted?.(data.event);
      onClose?.();
    } catch (err) {
      showToast?.(err.message || 'Gửi yêu cầu thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ev-st-detail-modal" role="dialog" aria-modal="true">
      <div className="ev-st-detail-backdrop" onClick={onClose} />
      <div className="ev-st-detail-panel ev-moderation-dialog">
        <button type="button" className="ev-st-detail-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h3 className="ev-overview-title">{actionLabel}</h3>
        {eventTitle ? <p className="ev-cancel-hint">Sự kiện: {eventTitle}</p> : null}
        <p className="ev-overview-desc">{hint}</p>
        <form className="ev-moderation-form" onSubmit={handleSubmit}>
          <fieldset className="ev-moderation-fieldset">
            <legend className="ev-moderation-label">Lý do</legend>
            <div className="ev-moderation-reasons" role="radiogroup" aria-label="Lý do">
              {CLUB_MODERATION_REASONS.filter((r) => !r.noApproval).map((r) => (
                <label
                  key={r.value}
                  className={`ev-moderation-radio${reasonCategory === r.value ? ' is-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="club-moderation-reason"
                    value={r.value}
                    checked={reasonCategory === r.value}
                    onChange={() => setReasonCategory(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="ev-moderation-field">
            <label className="ev-moderation-label" htmlFor="club-moderation-content">
              Nội dung chi tiết
            </label>
            <textarea
              id="club-moderation-content"
              className="ev-moderation-textarea"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mô tả lý do và nội dung cần chỉnh sửa / xóa…"
            />
          </div>
          <div className="ev-moderation-actions">
            <button type="button" className="ev-btn-outline" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="ev-btn-primary" disabled={submitting}>
              {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubEventModerationDialog;
