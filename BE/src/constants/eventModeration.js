/**
 * Code First — yêu cầu hủy / hoãn / ẩn sự kiện cấp trường (đồng bộ FE)
 */

const MODERATION_ACTIONS = ['cancel', 'hide', 'postpone', 'edit'];

const MODERATION_PENDING_STATUSES = [
  'pending_cancel',
  'pending_hide',
  'pending_postpone',
  'pending_edit'
];

const MODERATION_STATUS_BY_ACTION = {
  cancel: 'pending_cancel',
  hide: 'pending_hide',
  postpone: 'pending_postpone',
  edit: 'pending_edit'
};

const MODERATION_ACTION_LABELS = {
  cancel: 'Hủy sự kiện',
  hide: 'Ẩn sự kiện',
  postpone: 'Hoãn sự kiện',
  edit: 'Chỉnh sửa sự kiện'
};

/** Trạng thái CTSV được gửi yêu cầu điều phối (trước & sau publish) */
const CTSV_MODERATABLE_STATUSES = ['pending_admin', 'approved', 'live', 'ended', 'rejected'];

const canCtsvRequestModeration = (event) =>
  event?.source === 'school' &&
  CTSV_MODERATABLE_STATUSES.includes(event?.status) &&
  !MODERATION_PENDING_STATUSES.includes(event?.status);

const isModerationPendingStatus = (status) => MODERATION_PENDING_STATUSES.includes(status);

const getModerationActionFromStatus = (status) => {
  if (status === 'pending_cancel') return 'cancel';
  if (status === 'pending_hide') return 'hide';
  if (status === 'pending_postpone') return 'postpone';
  if (status === 'pending_edit') return 'edit';
  return null;
};

module.exports = {
  MODERATION_ACTIONS,
  MODERATION_PENDING_STATUSES,
  MODERATION_STATUS_BY_ACTION,
  MODERATION_ACTION_LABELS,
  CTSV_MODERATABLE_STATUSES,
  canCtsvRequestModeration,
  isModerationPendingStatus,
  getModerationActionFromStatus
};
