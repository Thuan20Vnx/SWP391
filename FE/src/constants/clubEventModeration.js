/**
 * Code First — đồng bộ BE/src/constants/eventModeration.js (CLB hoãn/hủy)
 */

export const CLUB_MODERATION_REASONS = [
  { value: 'weather', label: 'Do điều kiện thời tiết', noApproval: true },
  { value: 'force_majeure', label: 'Bất khả kháng / sự cố' },
  { value: 'scheduling', label: 'Trùng lịch / thay đổi kế hoạch' },
  { value: 'resources', label: 'Thiếu nhân sự / nguồn lực' },
  { value: 'other', label: 'Lý do khác' }
];

export const ICPDP_MODERATION_PENDING_STATUSES = [
  'pending_icpdp_cancel',
  'pending_icpdp_postpone'
];

export const isIcpdpModerationPending = (event) =>
  ICPDP_MODERATION_PENDING_STATUSES.includes(event?.statusKey || event?.status);

export const isAdminModerationPending = (event) => {
  const key = event?.statusKey || event?.status;
  return ['pending_cancel', 'pending_postpone'].includes(key);
};

export const canClubSubmitModeration = (event) => {
  const key = event?.statusKey || event?.status;
  if (event?.source !== 'club') return false;
  if (event?.eventState === 'postponed') return false;
  if (['approved', 'live', 'ended'].includes(key)) {
    return !isIcpdpModerationPending(event) && !isAdminModerationPending(event);
  }
  return false;
};
