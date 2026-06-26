/**
 * Code First — yêu cầu hủy / hoãn / ẩn sự kiện cấp trường (đồng bộ FE)
 */

const MODERATION_ACTIONS = ['cancel', 'hide', 'postpone', 'edit'];

const MODERATION_PENDING_STATUSES = [
  'pending_cancel',
  'pending_hide',
  'pending_postpone',
  'pending_edit',
  'pending_delete',
];

/** CLB gửi yêu cầu — chờ IC-PDP duyệt trước khi chuyển Admin */
const ICPDP_MODERATION_PENDING_STATUSES = [
  'pending_icpdp_cancel',
  'pending_icpdp_postpone',
  'pending_icpdp_delete',
  'pending_icpdp_edit',
];

const ICPDP_MODERATION_STATUS_BY_ACTION = {
  cancel: 'pending_icpdp_cancel',
  postpone: 'pending_icpdp_postpone',
  delete: 'pending_icpdp_delete',
  edit: 'pending_icpdp_edit',
};

const CLUB_MODERATION_ACTIONS = ['cancel', 'postpone', 'delete', 'edit'];

/** CLB hủy đề xuất ngay khi chưa được duyệt */
const CLUB_PENDING_CANCEL_STATUSES = ['pending', 'pending_ctsv', 'pending_icpdp', 'revision'];

const CLUB_MODERATABLE_STATUSES = ['approved', 'live', 'ended'];

const CLUB_MODERATION_REASON_LABELS = {
  weather: 'Do điều kiện thời tiết',
  force_majeure: 'Bất khả kháng / sự cố',
  scheduling: 'Trùng lịch / thay đổi kế hoạch',
  resources: 'Thiếu nhân sự / nguồn lực',
  other: 'Lý do khác'
};

const MODERATION_STATUS_BY_ACTION = {
  cancel: 'pending_cancel',
  hide: 'pending_hide',
  postpone: 'pending_postpone',
  edit: 'pending_edit',
  delete: 'pending_delete',
};

const MODERATION_ACTION_LABELS = {
  cancel: 'Hủy sự kiện',
  hide: 'Ẩn sự kiện',
  postpone: 'Hoãn sự kiện',
  edit: 'Chỉnh sửa sự kiện',
  delete: 'Xóa sự kiện',
};

/** Trạng thái CTSV được gửi yêu cầu điều phối (trước & sau publish) */
const CTSV_MODERATABLE_STATUSES = ['pending_admin', 'approved', 'live', 'ended', 'rejected'];

const canCtsvRequestModeration = (event) =>
  event?.source === 'school' &&
  CTSV_MODERATABLE_STATUSES.includes(event?.status) &&
  !MODERATION_PENDING_STATUSES.includes(event?.status) &&
  !ICPDP_MODERATION_PENDING_STATUSES.includes(event?.status);

const canClubRequestModeration = (event) =>
  event?.source === 'club' &&
  CLUB_MODERATABLE_STATUSES.includes(event?.status) &&
  !MODERATION_PENDING_STATUSES.includes(event?.status) &&
  !ICPDP_MODERATION_PENDING_STATUSES.includes(event?.status) &&
  event?.eventState !== 'postponed';

const canClubCancelPending = (event) =>
  event?.source === 'club' &&
  CLUB_PENDING_CANCEL_STATUSES.includes(event?.status) &&
  event?.status !== 'cancelled';

const canClubUnhide = (event) =>
  event?.source === 'club' && (event?.status === 'hidden' || event?.isHidden === true);

const isModerationPendingStatus = (status) => MODERATION_PENDING_STATUSES.includes(status);

const isIcpdpModerationPendingStatus = (status) =>
  ICPDP_MODERATION_PENDING_STATUSES.includes(status);

const getModerationActionFromStatus = (status) => {
  if (status === 'pending_cancel' || status === 'pending_icpdp_cancel') return 'cancel';
  if (status === 'pending_hide') return 'hide';
  if (status === 'pending_postpone' || status === 'pending_icpdp_postpone') return 'postpone';
  if (status === 'pending_edit' || status === 'pending_icpdp_edit') return 'edit';
  if (status === 'pending_delete' || status === 'pending_icpdp_delete') return 'delete';
  return null;
};

const wasClubEventAdminApproved = (event) => Boolean(event?.adminApprovedAt);

const canClubImmediateDelete = (event) => {
  if (event?.source !== 'club') return false;
  if (wasClubEventAdminApproved(event)) return false;
  if (isModerationPendingStatus(event?.status)) return false;
  if (isIcpdpModerationPendingStatus(event?.status)) return false;
  return CLUB_PENDING_CANCEL_STATUSES.includes(event?.status) || event?.status === 'rejected';
};

const canClubRequestDeleteModeration = (event) => {
  if (event?.source !== 'club') return false;
  const status = event?.status;
  if (status === 'pending_icpdp_edit' || status === 'pending_edit') return true;
  if (isModerationPendingStatus(status)) return false;
  if (isIcpdpModerationPendingStatus(status)) return false;
  if (canClubRequestModeration(event)) return true;
  return wasClubEventAdminApproved(event) && CLUB_PENDING_CANCEL_STATUSES.includes(event?.status);
};

const buildClubModerationReason = (reasonCategory, content) => {
  const label = CLUB_MODERATION_REASON_LABELS[reasonCategory] || reasonCategory || '';
  const detail = String(content || '').trim();
  if (label && detail) return `${label}: ${detail}`;
  return detail || label;
};

module.exports = {
  MODERATION_ACTIONS,
  MODERATION_PENDING_STATUSES,
  ICPDP_MODERATION_PENDING_STATUSES,
  ICPDP_MODERATION_STATUS_BY_ACTION,
  CLUB_MODERATION_ACTIONS,
  CLUB_PENDING_CANCEL_STATUSES,
  CLUB_MODERATABLE_STATUSES,
  CLUB_MODERATION_REASON_LABELS,
  MODERATION_STATUS_BY_ACTION,
  MODERATION_ACTION_LABELS,
  CTSV_MODERATABLE_STATUSES,
  canCtsvRequestModeration,
  canClubRequestModeration,
  canClubCancelPending,
  canClubUnhide,
  isModerationPendingStatus,
  isIcpdpModerationPendingStatus,
  getModerationActionFromStatus,
  buildClubModerationReason,
  wasClubEventAdminApproved,
  canClubImmediateDelete,
  canClubRequestDeleteModeration,
};
