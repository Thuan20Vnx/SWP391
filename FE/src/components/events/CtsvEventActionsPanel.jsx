import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approveCtsvEvent,
  rejectCtsvEvent,
  revisionCtsvEvent,
  requestCtsvEventModeration,
} from '../../services/ctsvApi';
import { getUserRole, canCtsvFinalApprove } from '../../utils/auth';
import { getCtsvEventAccess } from '../../utils/ctsvEventAccess';
import {
  canCtsvRequestModeration,
  isModerationPending,
  MODERATION_ACTION_LABELS,
} from '../../constants/eventModeration';
import {
  isSchoolEventPendingAdmin,
  canCtsvEditSchoolEvent,
} from '../../constants/eventWorkflow';
import ConfirmDialog from '../ui/ConfirmDialog';

const MODERATION_CONFIRM = {
  edit: {
    title: 'Yêu cầu chỉnh sửa',
    message:
      'Yêu cầu sẽ chuyển sang Admin phê duyệt. Chỉ khi Admin xác nhận, bạn mới được mở form chỉnh sửa và gửi lại nội dung sự kiện.',
    confirmLabel: 'Gửi lên Admin',
  },
  cancel: {
    title: 'Yêu cầu hủy sự kiện',
    message:
      'Yêu cầu sẽ chuyển sang Admin phê duyệt. Chỉ khi Admin xác nhận, sự kiện mới được hủy.',
    confirmLabel: 'Gửi lên Admin',
    danger: true,
  },
  hide: {
    title: 'Yêu cầu ẩn sự kiện',
    message:
      'Yêu cầu sẽ chuyển sang Admin phê duyệt. Sau khi Admin xác nhận, sự kiện sẽ không hiển thị trên cổng sinh viên.',
    confirmLabel: 'Gửi lên Admin',
  },
  postpone: {
    title: 'Yêu cầu hoãn sự kiện',
    message:
      'Yêu cầu sẽ chuyển sang Admin phê duyệt. Chỉ khi Admin xác nhận, sự kiện mới chuyển sang trạng thái hoãn.',
    confirmLabel: 'Gửi lên Admin',
  },
  postponeWeather: {
    title: 'Hoãn do thời tiết',
    message: 'Sự kiện sẽ được hoãn ngay sau khi xác nhận, không cần Admin phê duyệt.',
    confirmLabel: 'Xác nhận hoãn',
  },
};

const getModerationConfirmConfig = (action, isWeatherPostpone) => {
  if (action === 'postpone' && isWeatherPostpone) return MODERATION_CONFIRM.postponeWeather;
  return MODERATION_CONFIRM[action] || null;
};

const CtsvEventActionsPanel = ({ event, eventId, showToast, onEventUpdated, editBasePath = '/ctsv/events' }) => {
  const [note, setNote] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [weatherPostpone, setWeatherPostpone] = useState(false);
  const [moderationConfirm, setModerationConfirm] = useState(null);
  const [moderationLoading, setModerationLoading] = useState(false);

  if (!event || !eventId) return null;

  const access = getCtsvEventAccess(event);
  const isCtsvOnly = getUserRole() === 'ctsv';
  const canFinalApprove = canCtsvFinalApprove(getUserRole());
  const canApprove =
    access.canManage && ['pending_ctsv', 'pending_icpdp', 'revision'].includes(event.statusKey);
  const showPartnerActions = canApprove && isCtsvOnly;
  const canEditSchoolEvent = canCtsvEditSchoolEvent(event);
  const moderationPending = isModerationPending(event);
  const showSchoolModeration =
    access.canManage && event.source === 'school' && canCtsvRequestModeration(event);
  const showCtsvActions = access.canManage && showPartnerActions;
  const showRequestEditBtn = showSchoolModeration && !canEditSchoolEvent;
  const showOpenEditFormLink =
    access.canManage && event.source === 'school' && canEditSchoolEvent && !moderationPending;

  const refresh = async () => {
    if (onEventUpdated) await onEventUpdated();
  };

  const handleApprove = async () => {
    if (!canFinalApprove) {
      showToast?.('Bạn không có quyền phê duyệt sự kiện.', 'error');
      return;
    }
    try {
      await approveCtsvEvent(eventId, note);
      showToast?.('Đã phê duyệt sự kiện!', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const handleReject = async () => {
    if (!note.trim()) {
      showToast?.('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    try {
      await rejectCtsvEvent(eventId, note);
      showToast?.('Đã từ chối sự kiện.', 'info');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const handleRevision = async () => {
    try {
      await revisionCtsvEvent(eventId, note);
      showToast?.('Đã gửi yêu cầu chỉnh sửa.', 'info');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const openModerationConfirm = (action) => {
    if (!moderationReason.trim()) {
      showToast?.('Vui lòng nhập lý do trước khi xác nhận.', 'error');
      return;
    }
    setModerationConfirm(action);
  };

  const executeModeration = async () => {
    const action = moderationConfirm;
    if (!action) return;

    setModerationLoading(true);
    try {
      const data = await requestCtsvEventModeration(eventId, {
        action,
        reason: moderationReason.trim(),
        isWeatherPostpone: action === 'postpone' && weatherPostpone,
      });
      showToast?.(data.message || 'Đã gửi yêu cầu.', 'success');
      setModerationReason('');
      setWeatherPostpone(false);
      setModerationConfirm(null);
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setModerationLoading(false);
    }
  };

  const moderationConfirmConfig = moderationConfirm
    ? getModerationConfirmConfig(moderationConfirm, weatherPostpone)
    : null;

  if (!access.canManage) {
    return (
      <div className="ev-table-card">
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Sự kiện do CLB hoặc đối tác tổ chức — bạn chỉ xem thông tin, không chỉnh sửa hay phê duyệt tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="ev-ctsv-actions">
      {access.canManage && event.source === 'school' && event.statusKey === 'approved' && (
        <div className="ev-rejection-reason ev-rejection-reason--info">
          <span className="ev-rejection-reason__label">Ghi chú</span>
          <p className="ev-rejection-reason__text">
            Admin đã phê duyệt và sự kiện đã tự động công khai. Nếu chỉnh sửa, đơn sẽ gửi lại Admin duyệt trước khi công khai lại.
          </p>
        </div>
      )}

      {access.canManage && event.source === 'school' && isSchoolEventPendingAdmin(event) && (
        <div className="ev-rejection-reason ev-rejection-reason--info">
          <span className="ev-rejection-reason__label">Trạng thái</span>
          <p className="ev-rejection-reason__text">
            Đơn tổ chức đã gửi và đang chờ Admin phê duyệt. Bạn có thể chỉnh sửa và gửi lại trước khi Admin duyệt.
          </p>
        </div>
      )}

      {moderationPending && event.moderationReason && (
        <div className="ev-rejection-reason ev-rejection-reason--warning">
          <span className="ev-rejection-reason__label">Chờ Admin</span>
          <p className="ev-rejection-reason__text">
            Đang chờ Admin phê duyệt yêu cầu{' '}
            <strong>{MODERATION_ACTION_LABELS[event.moderationAction] || 'điều phối'}</strong>: {event.moderationReason}
          </p>
        </div>
      )}

      {showSchoolModeration && (
        <div className="ctsv-moderation-card">
          <div className="ctsv-moderation-header">
            <div>
              <h3 className="ctsv-moderation-header__title">Điều phối sự kiện cấp trường</h3>
              <p className="ctsv-moderation-header__desc">
                Hoãn do thời tiết áp dụng ngay · Các thao tác khác cần Admin phê duyệt
              </p>
            </div>
          </div>

          {showOpenEditFormLink && (
            <div className="ctsv-moderation-edit-approved">
              <span className="ctsv-moderation-edit-approved__badge">Admin đã duyệt chỉnh sửa</span>
              <Link to={`${editBasePath}/${eventId}/edit`} className="ev-btn-primary" style={{ display: 'inline-flex' }}>
                Mở form chỉnh sửa
              </Link>
            </div>
          )}

          <div className="ctsv-moderation-body">
            <label className="ctsv-moderation-label">Lý do thực hiện</label>
            <textarea
              className="ctsv-moderation-textarea"
              placeholder="Mô tả lý do hủy / hoãn / ẩn / chỉnh sửa..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              rows={3}
            />

            <label className="ctsv-weather-toggle">
              <div className={`ctsv-weather-toggle__track ${weatherPostpone ? 'ctsv-weather-toggle__track--on' : ''}`}>
                <div className="ctsv-weather-toggle__thumb" />
              </div>
              <input
                type="checkbox"
                checked={weatherPostpone}
                onChange={(e) => setWeatherPostpone(e.target.checked)}
                style={{ display: 'none' }}
              />
              <span className="ctsv-weather-toggle__label">
                Hoãn do thời tiết
                <span className="ctsv-weather-toggle__sublabel">Áp dụng ngay, không cần Admin duyệt</span>
              </span>
            </label>

            <div className="ctsv-moderation-actions">
              <div className="ctsv-moderation-actions__left">
                {showRequestEditBtn && (
                  <button type="button" className="ctsv-action-btn ctsv-action-btn--edit" onClick={() => openModerationConfirm('edit')}>
                    Yêu cầu chỉnh sửa
                  </button>
                )}
                <button type="button" className="ctsv-action-btn ctsv-action-btn--postpone" onClick={() => openModerationConfirm('postpone')}>
                  {weatherPostpone ? 'Hoãn (thời tiết)' : 'Yêu cầu hoãn'}
                </button>
                <button type="button" className="ctsv-action-btn ctsv-action-btn--hide" onClick={() => openModerationConfirm('hide')}>
                  Yêu cầu ẩn
                </button>
              </div>
              <button type="button" className="ctsv-action-btn ctsv-action-btn--cancel" onClick={() => openModerationConfirm('cancel')}>
                Yêu cầu hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showCtsvActions && (
        <div className="ev-table-card">
          <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem' }}>Phê duyệt</h3>
          {showPartnerActions && (
            <textarea
              className="ctsv-textarea"
              placeholder="Ghi chú / lý do (bắt buộc khi từ chối)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ width: '100%', marginBottom: 12 }}
            />
          )}
          <div className="ctsv-action-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {showPartnerActions && (
              <>
                <button type="button" className="ev-btn-primary" onClick={handleApprove}>
                  Phê duyệt
                </button>
                <button type="button" className="ev-btn-outline" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={handleReject}>
                  Từ chối
                </button>
                <button type="button" className="ev-btn-outline" onClick={handleRevision}>
                  Yêu cầu chỉnh sửa
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(moderationConfirm && moderationConfirmConfig)}
        title={moderationConfirmConfig?.title}
        message={moderationConfirmConfig?.message}
        confirmLabel={moderationConfirmConfig?.confirmLabel}
        danger={moderationConfirmConfig?.danger}
        loading={moderationLoading}
        onCancel={() => !moderationLoading && setModerationConfirm(null)}
        onConfirm={executeModeration}
      />
    </div>
  );
};

export default CtsvEventActionsPanel;
