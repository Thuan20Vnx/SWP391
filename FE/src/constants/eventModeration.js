/**
 * Code First — đồng bộ BE/src/constants/eventModeration.js
 */

export const MODERATION_ACTIONS = ['cancel', 'hide', 'postpone', 'edit'];

export const MODERATION_PENDING_STATUSES = [
  'pending_cancel',
  'pending_hide',
  'pending_postpone',
  'pending_edit'
];

export const MODERATION_ACTION_LABELS = {
  cancel: 'Hủy sự kiện',
  hide: 'Ẩn sự kiện',
  postpone: 'Hoãn sự kiện',
  edit: 'Chỉnh sửa sự kiện'
};

export const CTSV_MODERATABLE_STATUSES = ['pending_admin', 'approved', 'live', 'ended', 'rejected'];

export const canCtsvRequestModeration = (event) =>
  event?.source === 'school' &&
  CTSV_MODERATABLE_STATUSES.includes(event?.statusKey) &&
  !MODERATION_PENDING_STATUSES.includes(event?.statusKey);

export const isModerationPending = (event) =>
  MODERATION_PENDING_STATUSES.includes(event?.statusKey);
