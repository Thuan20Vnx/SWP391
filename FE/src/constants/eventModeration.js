/**
 * Code First — đồng bộ BE/src/constants/eventModeration.js
 */

export const MODERATION_ACTIONS = ['cancel', 'hide', 'postpone', 'edit'];

export const MODERATION_PENDING_STATUSES = [
  'pending_cancel',
  'pending_hide',
  'pending_postpone',
  'pending_edit',
  'pending_delete',
];

export const ICPDP_MODERATION_PENDING_STATUSES = [
  'pending_icpdp_cancel',
  'pending_icpdp_postpone',
  'pending_icpdp_delete',
  'pending_icpdp_edit',
];

export const MODERATION_ACTION_LABELS = {
  cancel: 'Hủy sự kiện',
  hide: 'Ẩn sự kiện',
  postpone: 'Hoãn sự kiện',
  edit: 'Chỉnh sửa sự kiện',
  delete: 'Xóa sự kiện',
};

export const CTSV_MODERATABLE_STATUSES = ['pending_admin', 'approved', 'live', 'ended', 'rejected'];

export const canCtsvRequestModeration = (event) =>
  event?.source === 'school' &&
  CTSV_MODERATABLE_STATUSES.includes(event?.statusKey) &&
  !MODERATION_PENDING_STATUSES.includes(event?.statusKey) &&
  !ICPDP_MODERATION_PENDING_STATUSES.includes(event?.statusKey);

export const isModerationPending = (event) =>
  MODERATION_PENDING_STATUSES.includes(event?.statusKey);

export const isIcpdpModerationPending = (event) =>
  ICPDP_MODERATION_PENDING_STATUSES.includes(event?.statusKey);
