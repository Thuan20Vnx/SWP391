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
  'ended'
];

/** CTSV gửi đơn tổ chức sự kiện cấp trường → chờ Admin */
const SCHOOL_EVENT_SUBMIT_STATUS = 'pending_admin';

/** Trạng thái sau khi Admin phê duyệt — CTSV mới được publish */
const SCHOOL_EVENT_APPROVED_STATUS = 'approved';

const SCHOOL_EVENT_PUBLIC_STATUSES = ['approved', 'live'];

/** Trạng thái CTSV được sửa và gửi lại Admin trước khi publish */
const SCHOOL_EVENT_EDITABLE_STATUSES = [
  SCHOOL_EVENT_SUBMIT_STATUS,
  'rejected',
  SCHOOL_EVENT_APPROVED_STATUS
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
  ended: 'ĐÃ KẾT THÚC'
};

const canAdminApproveSchoolEvent = (event) =>
  event?.source === 'school' && event?.status === SCHOOL_EVENT_SUBMIT_STATUS;

const canCtsvPublishSchoolEvent = (event) =>
  event?.source === 'school' && event?.status === SCHOOL_EVENT_APPROVED_STATUS;

const canCtsvEditSchoolEvent = (event) =>
  event?.source === 'school' &&
  SCHOOL_EVENT_EDITABLE_STATUSES.includes(event?.status);

const shouldResubmitSchoolEventForAdmin = (event) => canCtsvEditSchoolEvent(event);

const buildSchoolEventSubmitMeta = (authEmail) => ({
  status: SCHOOL_EVENT_SUBMIT_STATUS,
  ctsvSubmittedByEmail: authEmail || '',
  ctsvSubmittedAt: new Date(),
  approvedByEmail: '',
  adminApprovedByEmail: '',
  adminApprovedAt: null
});

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
  SCHOOL_EVENT_EDITABLE_STATUSES,
  STATUS_LABELS,
  canAdminApproveSchoolEvent,
  canCtsvPublishSchoolEvent,
  canCtsvEditSchoolEvent,
  shouldResubmitSchoolEventForAdmin,
  buildSchoolEventSubmitMeta,
  buildSchoolEventAdminApproveMeta
};
