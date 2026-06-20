/**
 * Code First — luồng trạng thái sự kiện (đồng bộ BE/src/constants/eventWorkflow.js)
 */

export const SCHOOL_EVENT_SUBMIT_STATUS = 'pending_admin';
export const SCHOOL_EVENT_APPROVED_STATUS = 'approved';

/** Đồng bộ BE — sự kiện hiển thị trên cổng sinh viên */
export const SCHOOL_EVENT_PUBLIC_STATUSES = ['approved', 'live'];

const NON_PUBLIC_STATUSES = [
  'cancelled',
  'hidden',
  'pending_icpdp_cancel',
  'pending_icpdp_postpone',
  'pending_cancel',
  'pending_hide',
  'pending_postpone',
  'pending_edit'
];

export const isEventPubliclyVisible = (eventOrStatus) => {
  const status = typeof eventOrStatus === 'string' ? eventOrStatus : eventOrStatus?.status;
  const isHidden = typeof eventOrStatus === 'object' && eventOrStatus?.isHidden === true;
  if (isHidden || NON_PUBLIC_STATUSES.includes(status)) return false;
  return SCHOOL_EVENT_PUBLIC_STATUSES.includes(status);
};

/** Trạng thái có thể gửi yêu cầu chỉnh sửa (đồng bộ BE) */
export const SCHOOL_EVENT_EDIT_REQUEST_STATUSES = [
  SCHOOL_EVENT_SUBMIT_STATUS,
  'rejected',
  SCHOOL_EVENT_APPROVED_STATUS,
  'live',
  'ended'
];

export const SCHOOL_EVENT_STATUS_LABELS = {
  pending_admin: 'Chờ Admin duyệt',
  approved: 'Mở đăng ký',
  rejected: 'Từ chối',
  live: 'Đang diễn ra',
  ended: 'Đã kết thúc',
  pending_icpdp_cancel: 'Chờ IC-PDP — Hủy',
  pending_icpdp_postpone: 'Chờ IC-PDP — Hoãn',
  pending_cancel: 'Chờ Admin — Hủy',
  pending_hide: 'Chờ Admin — Ẩn',
  pending_postpone: 'Chờ Admin — Hoãn',
  pending_edit: 'Chờ Admin — Chỉnh sửa',
  cancelled: 'Đã hủy',
  hidden: 'Đã ẩn'
};

export const canCtsvPublishSchoolEvent = (event) =>
  event?.source === 'school' && event?.statusKey === SCHOOL_EVENT_APPROVED_STATUS;

export const canCtsvEditSchoolEvent = (event) =>
  event?.source === 'school' &&
  (event?.ctsvEditUnlocked === true || event?.statusKey === 'rejected');

/** Chỉnh sửa sự kiện cấp trường theo đơn vị gửi đơn (CTSV / IC-PDP) */
export const canEditSchoolEventForPortal = (event, portalRole = 'ctsv') => {
  if (!canCtsvEditSchoolEvent(event)) return false;
  const org = event?.schoolOrganizerRole || 'ctsv';
  if (portalRole === 'icpdp') return org === 'icpdp';
  if (portalRole === 'admin') return true;
  return org === 'ctsv';
};

export const isSchoolEventPendingAdmin = (event) =>
  event?.source === 'school' && event?.statusKey === SCHOOL_EVENT_SUBMIT_STATUS;
