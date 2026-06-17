const STATUS_LABELS = {
  draft: 'Bản nháp',
  pending_icpdp: 'Chờ IC-PDP duyệt',
  pending_ctsv: 'Chờ IC-PDP duyệt',
  approved: 'Đã phê duyệt',
  rejected: 'Từ chối',
  revision: 'Cần chỉnh sửa',
  cancelled: 'Đã hủy',
};

const CHANGE_TYPE_LABELS = {
  none: '',
  cancel: 'Hủy đơn timeline',
  edit: 'Sửa timeline',
  delete: 'Xóa timeline',
};

const CHANGE_STATUS_LABELS = {
  none: '',
  pending_icpdp: 'Chờ IC-PDP duyệt yêu cầu',
  pending_admin: 'Chờ Admin duyệt yêu cầu',
  approved: 'Yêu cầu đã được thực hiện',
  rejected: 'Yêu cầu bị từ chối',
};

const TERM_LABELS = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
};

const TERM_ORDER = { spring: 1, summer: 2, fall: 3 };

const buildSemesterLabel = (term, year) => {
  const termLabel = TERM_LABELS[term] || term;
  return `${termLabel} ${year}`;
};

const formatTimelineItem = (item) => ({
  title: item.title || '',
  description: item.description || '',
  plannedDate: item.plannedDate || null,
  category: item.category || 'Workshop',
  location: item.location || '',
  expectedAttendees: Number(item.expectedAttendees) || 0,
  notes: item.notes || '',
});

const formatChangeRequest = (cr) => {
  if (!cr || !cr.type || cr.type === 'none') return null;
  const statusKey = cr.status || 'none';
  return {
    type: cr.type,
    typeLabel: CHANGE_TYPE_LABELS[cr.type] || cr.type,
    status: CHANGE_STATUS_LABELS[statusKey] || statusKey,
    statusKey,
    reason: cr.reason || '',
    payload: cr.payload || null,
    requestedAt: cr.requestedAt || null,
    icpdpNote: cr.icpdpNote || '',
    adminNote: cr.adminNote || '',
    reviewedAt: cr.reviewedAt || null,
  };
};

const formatClubSemesterTimeline = (doc) => {
  if (!doc) return null;
  const r = doc.toObject ? doc.toObject() : doc;
  const statusKey = r.status || 'draft';
  return {
    id: String(r._id),
    clubId: r.clubId ? String(r.clubId) : '',
    clubName: r.clubName || '',
    clubSlug: r.clubSlug || '',
    semesterTerm: r.semesterTerm,
    semesterYear: r.semesterYear,
    semesterLabel: r.semesterLabel || buildSemesterLabel(r.semesterTerm, r.semesterYear),
    summary: r.summary || '',
    objectives: r.objectives || '',
    items: Array.isArray(r.items) ? r.items.map(formatTimelineItem) : [],
    status: STATUS_LABELS[statusKey] || statusKey,
    statusKey,
    submittedByEmail: r.submittedByEmail || '',
    icpdpNote: r.icpdpNote || '',
    ctsvNote: r.ctsvNote || '',
    rejectionReason: r.rejectionReason || '',
    reviewedByEmail: r.reviewedByEmail || '',
    reviewedAt: r.reviewedAt || null,
    submittedAt: r.submittedAt || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    changeRequest: formatChangeRequest(r.changeRequest),
  };
};

module.exports = {
  STATUS_LABELS,
  CHANGE_TYPE_LABELS,
  CHANGE_STATUS_LABELS,
  TERM_LABELS,
  TERM_ORDER,
  buildSemesterLabel,
  formatTimelineItem,
  formatClubSemesterTimeline,
};
