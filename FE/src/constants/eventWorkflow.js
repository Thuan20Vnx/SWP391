/**
 * Code First — luồng trạng thái sự kiện (đồng bộ BE/src/constants/eventWorkflow.js)
 */

export const SCHOOL_EVENT_SUBMIT_STATUS = 'pending_admin';
export const SCHOOL_EVENT_APPROVED_STATUS = 'approved';

export const SCHOOL_EVENT_EDITABLE_STATUSES = [
  SCHOOL_EVENT_SUBMIT_STATUS,
  'rejected',
  SCHOOL_EVENT_APPROVED_STATUS
];

export const SCHOOL_EVENT_STATUS_LABELS = {
  pending_admin: 'Chờ Admin duyệt',
  approved: 'Mở đăng ký',
  rejected: 'Từ chối',
  live: 'Đang diễn ra',
  ended: 'Đã kết thúc'
};

export const canCtsvPublishSchoolEvent = (event) =>
  event?.source === 'school' && event?.statusKey === SCHOOL_EVENT_APPROVED_STATUS;

export const canCtsvEditSchoolEvent = (event) =>
  event?.source === 'school' &&
  SCHOOL_EVENT_EDITABLE_STATUSES.includes(event?.statusKey);

export const isSchoolEventPendingAdmin = (event) =>
  event?.source === 'school' && event?.statusKey === SCHOOL_EVENT_SUBMIT_STATUS;
