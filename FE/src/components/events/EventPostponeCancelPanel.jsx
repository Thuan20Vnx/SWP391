import React, { useEffect, useMemo, useState } from 'react';
import {
  CLUB_MODERATION_REASONS,
  canClubCancelPending,
  canClubSubmitHide,
  canClubSubmitModeration,
  canClubUnhide,
  isAdminModerationPending,
  isClubEventHidden,
  isHideModerationPending,
  isIcpdpModerationPending,
} from '../../constants/clubEventModeration';
import ClubModerationBannerContent from './ClubModerationBannerContent';
import { buildClubModerationBannerCopy } from '../../utils/clubModerationBanner';
import { SCHOOL_EVENT_STATUS_LABELS } from '../../constants/eventWorkflow';
import { requestClubEventModeration } from '../../utils/api';

const ReasonFieldset = ({ action, reasonCategory, setReasonCategory, disableWeatherForCancel }) => (
  <fieldset className="ev-moderation-fieldset">
    <legend className="ev-moderation-label">Lý do</legend>
    <div className="ev-moderation-reasons" role="radiogroup" aria-label="Lý do">
      {CLUB_MODERATION_REASONS.map((r) => {
        const disabled =
          (action === 'cancel' && r.noApproval) ||
          (action === 'hide' && r.noApproval) ||
          (disableWeatherForCancel && r.noApproval);
        const labelText =
          r.noApproval && action === 'postpone' ? `${r.label} (không cần duyệt)` : r.label;
        return (
          <label
            key={r.value}
            className={`ev-moderation-radio${
              reasonCategory === r.value ? ' is-active' : ''
            }${disabled ? ' is-disabled' : ''}`}
          >
            <input
              type="radio"
              name={`moderation-reason-${action}`}
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
);

const DetailField = ({ id, content, setContent, placeholder }) => (
  <div className="ev-moderation-field">
    <label className="ev-moderation-label" htmlFor={id}>
      Nội dung chi tiết
    </label>
    <textarea
      id={id}
      className="ev-moderation-textarea"
      rows={4}
      placeholder={placeholder}
      value={content}
      onChange={(e) => setContent(e.target.value)}
    />
  </div>
);

const ModerationCollapsible = ({ title, hint, panelId, open, onToggle, children }) => (
  <section className="ev-moderation-collapsible">
    <button
      type="button"
      className="ev-moderation-collapsible__trigger"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
    >
      <span className="ev-moderation-collapsible__trigger-text">
        <strong className="ev-overview-title">{title}</strong>
        {hint && <span className="ev-cancel-hint">{hint}</span>}
      </span>
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        aria-hidden="true"
        className={`ev-moderation-collapsible__chevron${open ? ' is-open' : ''}`}
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    {open && (
      <div id={panelId} className="ev-moderation-collapsible__panel">
        {children}
      </div>
    )}
  </section>
);

const EventPostponeCancelPanel = ({ event, eventId, showToast, onEventUpdated }) => {
  const [action, setAction] = useState('postpone');
  const [reasonCategory, setReasonCategory] = useState('');
  const [content, setContent] = useState('');
  const [pendingReason, setPendingReason] = useState('');
  const [pendingContent, setPendingContent] = useState('');
  const [hideReason, setHideReason] = useState('');
  const [hideContent, setHideContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unhideLoading, setUnhideLoading] = useState(false);
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);

  // Đã có sinh viên đăng ký thì chỉ được hoãn, không cho hủy (khớp guard phía BE).
  const hasRegistrations = (event?.registeredCount || 0) > 0;

  useEffect(() => {
    if (action === 'cancel' && reasonCategory === 'weather') {
      setReasonCategory('');
    }
  }, [action, reasonCategory]);

  useEffect(() => {
    if (hasRegistrations && action === 'cancel') {
      setAction('postpone');
    }
  }, [hasRegistrations, action]);

  const selectedReason = useMemo(
    () => CLUB_MODERATION_REASONS.find((r) => r.value === reasonCategory),
    [reasonCategory],
  );

  const isWeatherPostpone = action === 'postpone' && reasonCategory === 'weather';
  const canSubmit = canClubSubmitModeration(event);
  const canCancelPending = canClubCancelPending(event);
  const canHide = canClubSubmitHide(event);
  const canUnhide = canClubUnhide(event);
  const icpdpPending = isIcpdpModerationPending(event);
  const adminPending = isAdminModerationPending(event);
  const hidePending = isHideModerationPending(event);
  const isPostponed = event?.eventState === 'postponed';
  const isCancelled = event?.statusKey === 'cancelled';
  const isHidden = isClubEventHidden(event);

  const statusLabel = (key) => SCHOOL_EVENT_STATUS_LABELS[key] || key;

  const submitModeration = async (payload, reset) => {
    setSubmitting(true);
    try {
      const data = await requestClubEventModeration(eventId, payload);
      showToast?.(data.message || 'Đã gửi yêu cầu.', 'success');
      onEventUpdated?.(data.event);
      reset?.();
    } catch (err) {
      showToast?.(err.message || 'Gửi yêu cầu thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovedSubmit = async (e) => {
    e.preventDefault();
    if (!reasonCategory) {
      showToast?.('Vui lòng chọn lý do.', 'error');
      return;
    }
    if (!content.trim()) {
      showToast?.('Vui lòng nhập nội dung chi tiết.', 'error');
      return;
    }
    await submitModeration(
      { action, reasonCategory, content: content.trim() },
      () => {
        setContent('');
        if (!isWeatherPostpone) setReasonCategory('');
      },
    );
  };

  const handlePendingCancelSubmit = async (e) => {
    e.preventDefault();
    if (!pendingReason) {
      showToast?.('Vui lòng chọn lý do.', 'error');
      return;
    }
    if (!pendingContent.trim()) {
      showToast?.('Vui lòng nhập nội dung chi tiết.', 'error');
      return;
    }
    await submitModeration(
      { action: 'cancel', reasonCategory: pendingReason, content: pendingContent.trim() },
      () => {
        setPendingReason('');
        setPendingContent('');
      },
    );
  };

  const handleHideSubmit = async (e) => {
    e.preventDefault();
    if (!hideReason) {
      showToast?.('Vui lòng chọn lý do.', 'error');
      return;
    }
    if (!hideContent.trim()) {
      showToast?.('Vui lòng nhập nội dung chi tiết.', 'error');
      return;
    }
    await submitModeration(
      { action: 'hide', reasonCategory: hideReason, content: hideContent.trim() },
      () => {
        setHideReason('');
        setHideContent('');
      },
    );
  };

  const handleUnhide = async () => {
    setUnhideLoading(true);
    try {
      const data = await requestClubEventModeration(eventId, {
        action: 'unhide',
        reasonCategory: 'other',
        content: 'Hiện lại sự kiện trên cổng',
      });
      showToast?.(data.message || 'Đã hiện sự kiện.', 'success');
      onEventUpdated?.(data.event);
    } catch (err) {
      showToast?.(err.message || 'Không thể hiện sự kiện.', 'error');
    } finally {
      setUnhideLoading(false);
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
          {event.moderationReason && (
            <p>{buildClubModerationBannerCopy(event).reasonLine || event.moderationReason}</p>
          )}
        </div>
      )}

      {isHidden && !hidePending && (
        <div className="ev-moderation-banner ev-moderation-banner--info" role="status">
          <strong>Sự kiện đang ẩn</strong>
          <p>Sự kiện không hiển thị trên cổng sinh viên. Bạn có thể hiện lại ngay mà không cần Admin duyệt.</p>
          {event.moderationReason && (
            <p className="ev-moderation-banner__hint">
              {buildClubModerationBannerCopy(event).reasonLine || `Lý do ẩn: ${event.moderationReason}`}
            </p>
          )}
        </div>
      )}

      {hidePending && (
        <div className="ev-moderation-banner ev-moderation-banner--pending" role="status">
          <strong>Đang chờ Admin duyệt yêu cầu ẩn sự kiện</strong>
          <ClubModerationBannerContent event={event} />
        </div>
      )}

      {icpdpPending && (
        <div className="ev-moderation-banner ev-moderation-banner--pending" role="status">
          <strong>Đang chờ IC-PDP duyệt</strong>
          <ClubModerationBannerContent
            event={event}
            icpdpHint
          />
        </div>
      )}

      {adminPending && !hidePending && (
        <div className="ev-moderation-banner ev-moderation-banner--pending" role="status">
          <strong>IC-PDP đã duyệt — đang chờ Admin</strong>
          <ClubModerationBannerContent event={event} icpdpNote={event.icpdpNote} />
        </div>
      )}

      {event?.rejectionReason && !icpdpPending && !adminPending && !hidePending && !canSubmit && !canCancelPending && (
        <div className="ev-moderation-banner ev-moderation-banner--danger" role="status">
          <strong>Yêu cầu bị từ chối</strong>
          <p>{event.rejectionReason}</p>
        </div>
      )}

      {canUnhide && (
        <section className="ev-moderation-section">
          <h3 className="ev-overview-title">Hiện sự kiện</h3>
          <p className="ev-cancel-hint">
            Sự kiện đang bị ẩn khỏi cổng công khai. Bấm hiện để mở lại ngay — không cần Admin duyệt.
          </p>
          <div className="ev-moderation-form-actions">
            <button
              type="button"
              className="ev-btn-primary"
              disabled={unhideLoading}
              onClick={handleUnhide}
            >
              {unhideLoading ? 'Đang xử lý...' : 'Hiện sự kiện'}
            </button>
          </div>
        </section>
      )}

      {canCancelPending && (
        <section className="ev-moderation-section">
          <h3 className="ev-overview-title">Yêu cầu hủy đề xuất</h3>
          <p className="ev-cancel-hint">
            Chỉ áp dụng khi sự kiện đang chờ duyệt. Hủy có hiệu lực ngay, không cần IC-PDP hay Admin
            duyệt.
          </p>
          <form className="ev-moderation-form" onSubmit={handlePendingCancelSubmit}>
            <ReasonFieldset
              action="cancel"
              reasonCategory={pendingReason}
              setReasonCategory={setPendingReason}
              disableWeatherForCancel
            />
            <DetailField
              id="ev-pending-cancel-content"
              content={pendingContent}
              setContent={setPendingContent}
              placeholder="Mô tả lý do hủy đề xuất sự kiện..."
            />
            <div className="ev-moderation-form-actions">
              <button
                type="submit"
                className="ev-btn-primary ev-btn-danger"
                disabled={submitting}
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận hủy đề xuất'}
              </button>
            </div>
          </form>
        </section>
      )}

      {canSubmit && (
        <ModerationCollapsible
          title="Gửi yêu cầu hoãn / hủy sự kiện"
          hint="Yêu cầu qua IC-PDP → Admin (hoãn thời tiết áp dụng ngay)"
          panelId="ev-mod-postpone-panel"
          open={postponeOpen}
          onToggle={() => setPostponeOpen((v) => !v)}
        >
          <form className="ev-moderation-form" onSubmit={handleApprovedSubmit}>
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
                {!hasRegistrations && (
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
                )}
              </div>
              {hasRegistrations && (
                <p className="ev-moderation-note">
                  Sự kiện đã có sinh viên đăng ký nên chỉ có thể hoãn, không thể hủy hoặc chỉnh sửa.
                </p>
              )}
            </fieldset>

            <ReasonFieldset
              action={action}
              reasonCategory={reasonCategory}
              setReasonCategory={setReasonCategory}
            />

            <DetailField
              id="ev-mod-content"
              content={content}
              setContent={setContent}
              placeholder="Mô tả cụ thể lý do hoãn/hủy, thông tin liên hệ hoặc kế hoạch dự phòng..."
            />

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
        </ModerationCollapsible>
      )}

      {canHide && (
        <ModerationCollapsible
          title="Ẩn sự kiện"
          hint="Cần Admin duyệt — hiện lại không cần duyệt"
          panelId="ev-mod-hide-panel"
          open={hideOpen}
          onToggle={() => setHideOpen((v) => !v)}
        >
          <form className="ev-moderation-form" onSubmit={handleHideSubmit}>
            <ReasonFieldset
              action="hide"
              reasonCategory={hideReason}
              setReasonCategory={setHideReason}
            />
            <DetailField
              id="ev-hide-content"
              content={hideContent}
              setContent={setHideContent}
              placeholder="Mô tả lý do ẩn sự kiện..."
            />
            <p className="ev-moderation-note">
              Sau khi gửi, yêu cầu chờ Admin phê duyệt trước khi sự kiện bị ẩn.
            </p>
            <div className="ev-moderation-form-actions">
              <button type="submit" className="ev-btn-outline" disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu ẩn'}
              </button>
            </div>
          </form>
        </ModerationCollapsible>
      )}

      {!canSubmit &&
        !canCancelPending &&
        !canHide &&
        !canUnhide &&
        !isPostponed &&
        !isCancelled &&
        !icpdpPending &&
        !adminPending &&
        !hidePending && (
          <p className="ev-panel-empty-cell">
            Không có thao tác hoãn/hủy/ẩn khả dụng ở trạng thái hiện tại.
          </p>
        )}
    </div>
  );
};

export default EventPostponeCancelPanel;
