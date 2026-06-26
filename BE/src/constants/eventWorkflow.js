/**
 * Code First — luồng trạng thái sự kiện (đồng bộ FE/src/constants/eventWorkflow.js)
 */

const EVENT_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'draft',
  'pending_icpdp',
  'pending_ctsv',
  'pending_admin',
  'revision',
  'live',
  'ended',
  'pending_icpdp_cancel',
  'pending_icpdp_postpone',
  'pending_icpdp_delete',
  'pending_icpdp_edit',
  'pending_cancel',
  'pending_hide',
  'pending_postpone',
  'pending_edit',
  'pending_delete',
  'cancelled',
  'hidden'
];

/** CTSV gửi đơn tổ chức sự kiện cấp trường → chờ Admin */
const SCHOOL_EVENT_SUBMIT_STATUS = 'pending_admin';

/** Trạng thái sau khi Admin phê duyệt — CTSV mới được publish */
const SCHOOL_EVENT_APPROVED_STATUS = 'approved';

const SCHOOL_EVENT_PUBLIC_STATUSES = ['approved', 'live'];

const NON_PUBLIC_STATUSES = [
  'cancelled',
  'hidden',
  'pending_icpdp_cancel',
  'pending_icpdp_postpone',
  'pending_icpdp_delete',
  'pending_icpdp_edit',
  'pending_cancel',
  'pending_hide',
  'pending_postpone',
  'pending_edit',
  'pending_delete',
];

/** Sự kiện hiển thị / đăng ký trên cổng sinh viên */
const isEventPubliclyVisible = (eventOrStatus) => {
  const status = typeof eventOrStatus === 'string' ? eventOrStatus : eventOrStatus?.status;
  const isHidden = typeof eventOrStatus === 'object' && eventOrStatus?.isHidden === true;
  if (isHidden || NON_PUBLIC_STATUSES.includes(status)) return false;
  return SCHOOL_EVENT_PUBLIC_STATUSES.includes(status);
};

/** Trạng thái có thể gửi yêu cầu chỉnh sửa (Admin duyệt trước khi mở form) */
const SCHOOL_EVENT_EDIT_REQUEST_STATUSES = [
  SCHOOL_EVENT_SUBMIT_STATUS,
  'rejected',
  SCHOOL_EVENT_APPROVED_STATUS,
  'live',
  'ended'
];

const STATUS_LABELS = {
  pending: 'CHỜ DUYỆT',
  approved: 'MỞ ĐĂNG KÝ',
  rejected: 'TỪ CHỐI',
  draft: 'Bản nháp',
  pending_icpdp: 'CHỜ ICPDP',
  pending_ctsv: 'CHỜ CTSV DUYỆT',
  pending_admin: 'CHỜ ADMIN DUYỆT',
  revision: 'CẦN CHỈNH SỬA',
  live: 'ĐANG DIỄN RA',
  ended: 'ĐÃ KẾT THÚC',
  pending_icpdp_cancel: 'CHỜ ICPDP — HỦY',
  pending_icpdp_postpone: 'CHỜ ICPDP — HOÃN',
  pending_icpdp_delete: 'CHỜ ICPDP — XÓA',
  pending_icpdp_edit: 'CHỜ ICPDP — CHỈNH SỬA',
  pending_cancel: 'CHỜ ADMIN — HỦY',
  pending_hide: 'CHỜ ADMIN — ẨN',
  pending_postpone: 'CHỜ ADMIN — HOÃN',
  pending_edit: 'CHỜ ADMIN — CHỈNH SỬA',
  pending_delete: 'CHỜ ADMIN — XÓA',
  cancelled: 'ĐÃ HỦY',
  hidden: 'ĐÃ ẨN'
};

const canAdminApproveSchoolEvent = (event) =>
  event?.source === 'school' && event?.status === SCHOOL_EVENT_SUBMIT_STATUS;

const canCtsvPublishSchoolEvent = (event) =>
  event?.source === 'school' && event?.status === SCHOOL_EVENT_APPROVED_STATUS;

const canCtsvEditSchoolEvent = (event) =>
  event?.source === 'school' &&
  (event?.ctsvEditUnlocked === true || event?.status === 'rejected');

const shouldResubmitSchoolEventForAdmin = (event) => canCtsvEditSchoolEvent(event);

const buildSchoolEventSubmitMeta = (authEmail) => ({
  status: SCHOOL_EVENT_SUBMIT_STATUS,
  ctsvSubmittedByEmail: authEmail || '',
  ctsvSubmittedAt: new Date(),
  approvedByEmail: '',
  adminApprovedByEmail: '',
  adminApprovedAt: null
});

const resolveSchoolOrganizerRole = (userRole) =>
  userRole === 'icpdp' ? 'icpdp' : 'ctsv';

const canRoleManageSchoolEvent = (event, userRole) => {
  if (!event || event.source !== 'school') return false;
  if (userRole === 'admin') return true;
  const org = event.schoolOrganizerRole || 'ctsv';
  if (userRole === 'icpdp') return org === 'icpdp';
  if (userRole === 'ctsv') return org === 'ctsv';
  return false;
};

const buildSchoolEventAdminApproveMeta = (authEmail) => ({
  status: SCHOOL_EVENT_APPROVED_STATUS,
  approvedByEmail: authEmail || '',
  adminApprovedByEmail: authEmail || '',
  adminApprovedAt: new Date()
});

module.exports = {
  EVENT_STATUSES,
  SCHOOL_EVENT_SUBMIT_STATUS,
  SCHOOL_EVENT_APPROVED_STATUS,
  SCHOOL_EVENT_PUBLIC_STATUSES,
  NON_PUBLIC_STATUSES,
  isEventPubliclyVisible,
  SCHOOL_EVENT_EDIT_REQUEST_STATUSES,
  STATUS_LABELS,
  canAdminApproveSchoolEvent,
  canCtsvPublishSchoolEvent,
  canCtsvEditSchoolEvent,
  shouldResubmitSchoolEventForAdmin,
  buildSchoolEventSubmitMeta,
  buildSchoolEventAdminApproveMeta,
  resolveSchoolOrganizerRole,
  canRoleManageSchoolEvent
};
