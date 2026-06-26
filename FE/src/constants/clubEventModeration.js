/**
 * Code First — đồng bộ BE/src/constants/eventModeration.js (CLB hoãn/hủy/ẩn)
 */

export const CLUB_MODERATION_REASONS = [
  { value: 'weather', label: 'Do điều kiện thời tiết', noApproval: true },
  { value: 'force_majeure', label: 'Bất khả kháng / sự cố' },
  { value: 'scheduling', label: 'Trùng lịch / thay đổi kế hoạch' },
  { value: 'resources', label: 'Thiếu nhân sự / nguồn lực' },
  { value: 'other', label: 'Lý do khác' },
];

export const CLUB_PENDING_CANCEL_STATUSES = ['pending', 'pending_ctsv', 'pending_icpdp', 'pending_admin', 'revision'];

/** Đồng bộ BE event.service.js — CLB sửa đề xuất: chờ duyệt, từ chối, đã duyệt */
export const CLUB_EDITABLE_EVENT_STATUSES = [
  'pending',
  'rejected',
  'approved',
  'live',
  'ended',
  'revision',
  'pending_ctsv',
  'pending_icpdp',
  'pending_admin',
];

const CLUB_STATUS_LABEL_TO_KEY = {
  'CHỜ DUYỆT': 'pending',
  'MỞ ĐĂNG KÝ': 'approved',
  'TỪ CHỐI': 'rejected',
  'CHỜ ICPDP': 'pending_icpdp',
  'CHỜ CTSV DUYỆT': 'pending_ctsv',
  'CẦN CHỈNH SỬA': 'revision',
  'Chờ duyệt': 'pending',
  'Mở đăng ký': 'approved',
  'Từ chối': 'rejected',
};

/** Lấy mã trạng thái thô (statusKey) từ event API hoặc danh sách */
export const resolveClubEventStatusKey = (event) => {
  if (!event) return '';
  const rawKey = event.statusKey;
  if (rawKey && CLUB_EDITABLE_EVENT_STATUSES.includes(rawKey)) return rawKey;
  if (rawKey) return rawKey;
  const rawStatus = event.status;
  if (rawStatus && CLUB_EDITABLE_EVENT_STATUSES.includes(rawStatus)) return rawStatus;
  if (typeof rawStatus === 'string') {
    const fromLabel = CLUB_STATUS_LABEL_TO_KEY[rawStatus] || CLUB_STATUS_LABEL_TO_KEY[rawStatus.toUpperCase()];
    if (fromLabel) return fromLabel;
  }
  return rawStatus || '';
};

export const CLUB_PENDING_APPROVAL_STATUSES = ['pending', 'pending_icpdp', 'pending_ctsv', 'pending_admin', 'revision'];

export const ICPDP_MODERATION_PENDING_STATUSES = [
  'pending_icpdp_cancel',
  'pending_icpdp_postpone',
  'pending_icpdp_delete',
  'pending_icpdp_edit',
];

export const isClubEventPendingApproval = (event) =>
  CLUB_PENDING_APPROVAL_STATUSES.includes(resolveClubEventStatusKey(event));

export const wasClubEventAdminApproved = (event) => Boolean(event?.adminApprovedAt);

export const hasClubModerationPending = (event) => {
  const key = event?.statusKey || event?.status;
  return [
    ...ICPDP_MODERATION_PENDING_STATUSES,
    'pending_cancel',
    'pending_postpone',
    'pending_hide',
    'pending_edit',
    'pending_delete',
  ].includes(key);
};

export const canClubImmediateDelete = (event) => {
  if (event?.source !== 'club') return false;
  if (wasClubEventAdminApproved(event)) return false;
  if (hasClubModerationPending(event)) return false;
  const key = resolveClubEventStatusKey(event);
  return CLUB_PENDING_CANCEL_STATUSES.includes(key) || key === 'rejected';
};

export const canClubDirectEdit = (event) => {
  if (event?.source !== 'club') return false;
  if (hasClubModerationPending(event)) return false;
  if (event?.clubEditUnlocked) return true;
  if (wasClubEventAdminApproved(event)) return false;
  const key = resolveClubEventStatusKey(event);
  return CLUB_PENDING_APPROVAL_STATUSES.includes(key) || key === 'rejected';
};

export const needsClubEditModerationRequest = (event) => {
  const key = resolveClubEventStatusKey(event);
  return (
    event?.source === 'club' &&
    ['approved', 'live', 'ended'].includes(key) &&
    !event?.clubEditUnlocked &&
    !hasClubModerationPending(event)
  );
};

export const canClubRequestDeleteModeration = (event) => {
  if (event?.source !== 'club') return false;
  const key = resolveClubEventStatusKey(event);
  if (key === 'pending_icpdp_edit' || key === 'pending_edit') return true;
  if (hasClubModerationPending(event)) return false;
  if (canClubSubmitModeration(event)) return true;
  return wasClubEventAdminApproved(event) && CLUB_PENDING_CANCEL_STATUSES.includes(key);
};

export const canClubEditEventProposal = (event) =>
  CLUB_EDITABLE_EVENT_STATUSES.includes(resolveClubEventStatusKey(event));

export const canClubDeleteEventProposal = (event) =>
  canClubImmediateDelete(event) || canClubRequestDeleteModeration(event);

export const isIcpdpModerationPending = (event) =>
  ICPDP_MODERATION_PENDING_STATUSES.includes(event?.statusKey || event?.status);

export const isAdminModerationPending = (event) => {
  const key = event?.statusKey || event?.status;
  return ['pending_cancel', 'pending_postpone', 'pending_hide', 'pending_edit', 'pending_delete'].includes(key);
};

export const isHideModerationPending = (event) =>
  (event?.statusKey || event?.status) === 'pending_hide';

export const isClubEventHidden = (event) =>
  (event?.statusKey || event?.status) === 'hidden' || event?.isHidden === true;

export const canClubCancelPending = (event) => {
  const key = event?.statusKey || event?.status;
  if (event?.source !== 'club') return false;
  if (key === 'cancelled') return false;
  return CLUB_PENDING_CANCEL_STATUSES.includes(key);
};

export const canClubUnhide = (event) =>
  event?.source === 'club' && isClubEventHidden(event);

export const canClubSubmitModeration = (event) => {
  const key = event?.statusKey || event?.status;
  if (event?.source !== 'club') return false;
  if (event?.eventState === 'postponed') return false;
  if (isClubEventHidden(event)) return false;
  if (['approved', 'live', 'ended'].includes(key)) {
    return !isIcpdpModerationPending(event) && !isAdminModerationPending(event);
  }
  return false;
};

export const canClubSubmitHide = (event) => canClubSubmitModeration(event);
