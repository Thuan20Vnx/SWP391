const { sanitizeEventPlanForApi, PLAN_SCOPES, buildClubTimelinePlanUrl, buildSchoolTimelinePlanUrl } = require('./eventPlanStorage');

const STATUS_LABELS = {
  draft: 'Bản nháp',
  pending_icpdp: 'Chờ IC-PDP duyệt',
  pending_admin: 'Chờ Admin duyệt',
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
  scheduled_delete: 'Đã duyệt xóa — đang chờ xóa',
};

const TERM_LABELS = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
};

const TERM_ORDER = { spring: 1, summer: 2, fall: 3 };

const OWNER_TYPE_LABELS = {
  club: 'CLB',
  icpdp: 'IC-PDP',
  ctsv: 'CTSV',
};

const { EVENT_VENUES, isValidEventVenue } = require('../constants/eventVenues');
const { attachConflictsToTimeline, invalidateRegistryCache } = require('../services/timelineLocationConflict.service');

const buildSemesterLabel = (term, year) => {
  const termLabel = TERM_LABELS[term] || term;
  return `${termLabel} ${year}`;
};

const formatTimelineItem = (item, extra = {}) => ({
  title: item.title || '',
  description: item.description || '',
  plannedDate: item.plannedDate || null,
  plannedEndDate: item.plannedEndDate || null,
  category: item.category || 'Workshop',
  location: item.location || '',
  expectedAttendees: Number(item.expectedAttendees) || 0,
  notes: item.notes || '',
  locationConflicts: item.locationConflicts || [],
  hasLocationConflict: Boolean(item.hasLocationConflict),
  ...extra,
});

const formatChangeRequest = (cr) => {
  if (!cr || !cr.type || cr.type === 'none') return null;
  const statusKey = cr.status || 'none';
  let status = CHANGE_STATUS_LABELS[statusKey] || statusKey;
  if (statusKey === 'rejected') {
    if (cr.type === 'cancel') status = 'Từ chối yêu cầu hủy đơn';
    else if (cr.type === 'delete') status = 'Từ chối yêu cầu xóa';
  }
  let typeLabel = CHANGE_TYPE_LABELS[cr.type] || cr.type;
  if (statusKey === 'rejected') {
    if (cr.type === 'cancel') typeLabel = 'Đã từng bị hủy đơn timeline';
    else if (cr.type === 'delete') typeLabel = 'Đã từng bị yêu cầu xóa timeline';
  }
  if (statusKey === 'scheduled_delete' && cr.scheduledDeleteAt) {
    const at = new Date(cr.scheduledDeleteAt);
    if (!Number.isNaN(at.getTime())) {
      const time = at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const date = at.toLocaleDateString('vi-VN');
      status = `Sẽ xóa lúc ${time} · ${date}`;
    }
  }
  return {
    type: cr.type,
    typeLabel,
    status,
    statusKey,
    reason: cr.reason || '',
    payload: cr.payload || null,
    requestedAt: cr.requestedAt || null,
    icpdpNote: cr.icpdpNote || '',
    adminNote: cr.adminNote || '',
    reviewedAt: cr.reviewedAt || null,
    scheduledDeleteAt: cr.scheduledDeleteAt || null,
  };
};

const resolveDisplayStatus = (statusKey, changeRequest, { everApproved = false } = {}) => {
  const cr = changeRequest;
  if (cr?.type && cr.type !== 'none' && cr.status === 'rejected') {
    if (statusKey === 'approved') {
      const actionLabel = cr.type === 'cancel' ? 'hủy' : cr.type === 'delete' ? 'xóa' : 'sửa';
      return {
        status: `Đã phê duyệt (yêu cầu ${actionLabel} từ chối)`,
        statusBadgeKey: 'approved',
      };
    }
    // Stale rejected change while re-approval is in progress — show workflow status instead.
    if (!['pending_admin', 'pending_icpdp'].includes(statusKey)) {
      const actionLabel = cr.type === 'cancel' ? 'hủy đơn' : cr.type === 'delete' ? 'xóa' : 'thay đổi';
      return {
        status: `Từ chối yêu cầu ${actionLabel}`,
        statusBadgeKey: 'rejected',
      };
    }
  }

  const hasPendingChange =
    cr?.type &&
    cr.type !== 'none' &&
    ['pending_icpdp', 'pending_admin', 'scheduled_delete'].includes(cr.status);

  if (hasPendingChange) {
    const actionLabel = cr.type === 'cancel' ? 'hủy' : cr.type === 'delete' ? 'xóa' : 'thay đổi';
    if (cr.status === 'scheduled_delete') {
      const at = cr.scheduledDeleteAt ? new Date(cr.scheduledDeleteAt) : null;
      const when =
        at && !Number.isNaN(at.getTime())
          ? at.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
          : '1 giờ nữa';
      return {
        status: `Đã duyệt xóa — xóa lúc ${when}`,
        statusBadgeKey: 'pending_admin',
      };
    }
    if (cr.status === 'pending_icpdp') {
      return {
        status: `Chờ IC-PDP duyệt ${actionLabel}`,
        statusBadgeKey: 'pending_icpdp',
      };
    }
    return {
      status: `Chờ Admin duyệt ${actionLabel}`,
      statusBadgeKey: 'pending_admin',
    };
  }

  if (statusKey === 'pending_admin' && everApproved) {
    return {
      status: 'Chờ Admin duyệt lại',
      statusBadgeKey: 'pending_admin',
    };
  }
  if (statusKey === 'pending_icpdp' && everApproved) {
    return {
      status: 'Chờ IC-PDP duyệt lại',
      statusBadgeKey: 'pending_icpdp',
    };
  }

  return {
    status: STATUS_LABELS[statusKey] || statusKey,
    statusBadgeKey: statusKey,
  };
};

const formatClubSemesterTimeline = async (doc, opts = {}) => {
  if (!doc) return null;
  const includePlanFile = opts.includePlanFile === true;
  const r = doc.toObject ? doc.toObject() : doc;
  const statusKey = r.status || 'draft';
  const ownerType = r.ownerType || 'club';
  const changeRequest = formatChangeRequest(r.changeRequest);
  const everApproved = Boolean(r.everApproved) || r.status === 'approved';
  const display = resolveDisplayStatus(statusKey, r.changeRequest, { everApproved });
  const base = {
    id: String(r._id),
    ownerType,
    ownerLabel: r.ownerLabel || OWNER_TYPE_LABELS[ownerType] || r.clubName || 'CLB',
    clubId: r.clubId ? String(r.clubId) : '',
    clubName: ownerType === 'club' ? (r.clubName || '') : (r.ownerLabel || OWNER_TYPE_LABELS[ownerType] || ''),
    clubSlug: r.clubSlug || '',
    semesterTerm: r.semesterTerm,
    semesterYear: r.semesterYear,
    semesterLabel: r.semesterLabel || buildSemesterLabel(r.semesterTerm, r.semesterYear),
    summary: r.summary || '',
    objectives: r.objectives || '',
    ...(sanitizeEventPlanForApi(r, PLAN_SCOPES.timelines, {
      planUrlBuilder: (id) =>
        (r.ownerType || 'club') === 'club'
          ? buildClubTimelinePlanUrl(id)
          : buildSchoolTimelinePlanUrl(id),
    })),
    eventPlanFile: '',
    items: Array.isArray(r.items) ? r.items.map((item) => formatTimelineItem(item)) : [],
    status: display.status,
    statusKey,
    statusBadgeKey: display.statusBadgeKey,
    submittedByEmail: r.submittedByEmail || '',
    icpdpNote: r.icpdpNote || '',
    ctsvNote: r.ctsvNote || '',
    rejectionReason: r.rejectionReason || '',
    reviewedByEmail: r.reviewedByEmail || '',
    reviewedAt: r.reviewedAt || null,
    submittedAt: r.submittedAt || null,
    everApproved,
    editRejected: Boolean(r.editRejected) && statusKey === 'approved',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    changeRequest,
    hasLocationConflict: false,
    locationConflictCount: 0,
  };

  if (opts.attachConflicts !== false) {
    await attachConflictsToTimeline(r, base);
  }

  return base;
};

module.exports = {
  STATUS_LABELS,
  CHANGE_TYPE_LABELS,
  CHANGE_STATUS_LABELS,
  TERM_LABELS,
  TERM_ORDER,
  OWNER_TYPE_LABELS,
  buildSemesterLabel,
  formatTimelineItem,
  formatClubSemesterTimeline,
  EVENT_VENUES,
  isValidEventVenue,
};
