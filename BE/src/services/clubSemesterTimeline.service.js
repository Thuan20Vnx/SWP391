const ClubSemesterTimeline = require('../models/ClubSemesterTimeline');
const { resolveManagedClub, findManagedClubs } = require('./club.service');
const {
  buildSemesterLabel,
  formatClubSemesterTimeline,
  formatTimelineItem,
  TERM_ORDER,
} = require('../utils/clubSemesterTimelineFormat');
const { invalidateRegistryCache } = require('./timelineLocationConflict.service');
const { entityHasAnyPlanFile, PLAN_SCOPES } = require('../utils/eventPlanStorage');
const { assertOnOrAfterToday, formatInvalidDateHint, parseStrictInstant } = require('../utils/dateValidation');
const AppError = require('../utils/AppError');

const SCHOOL_OWNER_META = {
  icpdp: { ownerType: 'icpdp', ownerLabel: 'IC-PDP' },
  ctsv: { ownerType: 'ctsv', ownerLabel: 'CTSV' },
};

const bumpRegistry = () => invalidateRegistryCache();

const timelineWasEverApproved = (timeline) =>
  Boolean(timeline?.everApproved) || timeline?.status === 'approved';

const captureApprovedSnapshot = (timeline) => ({
  semesterTerm: timeline.semesterTerm,
  semesterYear: timeline.semesterYear,
  semesterLabel: timeline.semesterLabel,
  summary: timeline.summary || '',
  objectives: timeline.objectives || '',
  items: JSON.parse(JSON.stringify(timeline.items || [])),
  eventPlanFile: timeline.eventPlanFile || '',
  eventPlanFileName: timeline.eventPlanFileName || '',
  eventPlanFileMime: timeline.eventPlanFileMime || '',
  eventPlanLink: timeline.eventPlanLink || '',
});

const restoreApprovedSnapshot = (timeline) => {
  const snap = timeline.approvedSnapshot;
  if (!snap || typeof snap !== 'object') return false;
  timeline.semesterTerm = snap.semesterTerm;
  timeline.semesterYear = snap.semesterYear;
  timeline.semesterLabel = snap.semesterLabel || buildSemesterLabel(snap.semesterTerm, snap.semesterYear);
  timeline.summary = snap.summary || '';
  timeline.objectives = snap.objectives || '';
  timeline.items = JSON.parse(JSON.stringify(snap.items || []));
  timeline.eventPlanFile = snap.eventPlanFile || '';
  timeline.eventPlanFileName = snap.eventPlanFileName || '';
  timeline.eventPlanFileMime = snap.eventPlanFileMime || '';
  timeline.eventPlanLink = snap.eventPlanLink || '';
  timeline.approvedSnapshot = null;
  return true;
};

const shouldStartReapprovalEdit = (timeline) =>
  timelineWasEverApproved(timeline) &&
  (timeline.status === 'approved' || hasPendingChangeRequest(timeline));

const hasStaleRejectedChange = (timeline) =>
  timeline.changeRequest?.type &&
  timeline.changeRequest.type !== 'none' &&
  timeline.changeRequest.status === 'rejected';

const shouldClearStaleRejectedChange = (timeline) =>
  hasStaleRejectedChange(timeline) &&
  ['pending_admin', 'pending_icpdp'].includes(timeline.status);

const isReapprovalRejection = (timeline, reviewerRole) => {
  if (!timelineWasEverApproved(timeline) || !timeline.approvedSnapshot) return false;
  if (hasPendingChangeRequest(timeline)) return false;
  if (reviewerRole === 'admin' && timeline.status === 'pending_admin') return true;
  if (reviewerRole !== 'admin' && timeline.status === 'pending_icpdp' && (timeline.ownerType || 'club') === 'club') {
    return true;
  }
  return false;
};

const beginReapprovalEdit = (timeline, pendingStatus) => {
  timeline.approvedSnapshot = captureApprovedSnapshot(timeline);
  clearChangeRequest(timeline);
  timeline.everApproved = true;
  timeline.status = pendingStatus;
  timeline.submittedAt = new Date();
  timeline.rejectionReason = '';
  timeline.icpdpNote = '';
  timeline.ctsvNote = '';
  timeline.editRejected = false;
};

const VALID_TERMS = ['spring', 'summer', 'fall'];
const MAX_LOCATION_LEN = 200;

const DELETE_GRACE_MS = 60 * 60 * 1000;

const ACTIVE_STATUSES = ['draft', 'pending_icpdp', 'pending_admin', 'approved', 'revision'];

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const location = String(item.location || '').trim();
      if (location.length > MAX_LOCATION_LEN) {
        const err = new Error(`Địa điểm tối đa ${MAX_LOCATION_LEN} ký tự.`);
        err.statusCode = 400;
        throw err;
      }
      const plannedDate = item.plannedDate ? parseStrictInstant(item.plannedDate) : null;
      const plannedEndDate = item.plannedEndDate ? parseStrictInstant(item.plannedEndDate) : null;
      if (item.plannedDate && !plannedDate) {
        throw new AppError(
          `Thời gian bắt đầu dự kiến không hợp lệ. ${formatInvalidDateHint(item.plannedDate)}`,
          400
        );
      }
      if (item.plannedEndDate && !plannedEndDate) {
        throw new AppError(
          `Thời gian kết thúc dự kiến không hợp lệ. ${formatInvalidDateHint(item.plannedEndDate)}`,
          400
        );
      }
      if (plannedDate) {
        assertOnOrAfterToday(plannedDate, 'Thời gian bắt đầu dự kiến');
      }
      return {
        title: String(item.title || '').trim(),
        description: String(item.description || '').trim(),
        plannedDate,
        plannedEndDate,
        category: String(item.category || 'Workshop').trim(),
        location,
        expectedAttendees: Math.max(0, Number(item.expectedAttendees) || 0),
        notes: String(item.notes || '').trim(),
      };
    })
    .filter((item) => item.title);
};

const isValidPlanLink = (value) => {
  const url = String(value || '').trim();
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const applyPlanFields = (timeline, payload, { requirePlan = false } = {}) => {
  const incomingFile = payload.eventPlanFile;
  const incomingLink = payload.eventPlanLink !== undefined
    ? String(payload.eventPlanLink || '').trim()
    : undefined;

  if (incomingFile) {
    timeline.eventPlanFile = incomingFile;
    timeline.eventPlanFileName = String(payload.eventPlanFileName || timeline.eventPlanFileName || 'bang-ke-hoach-su-kien').trim();
    timeline.eventPlanFileMime = String(payload.eventPlanFileMime || timeline.eventPlanFileMime || '').trim();
  } else if (incomingFile === '') {
    timeline.eventPlanFile = '';
    timeline.eventPlanFileName = '';
    timeline.eventPlanFileMime = '';
  }

  if (incomingLink !== undefined) {
    timeline.eventPlanLink = incomingLink;
  }

  const hasPlanFile = entityHasAnyPlanFile(timeline, PLAN_SCOPES.timelines);
  const hasPlanLink = isValidPlanLink(timeline.eventPlanLink);
  if (requirePlan && !hasPlanFile && !hasPlanLink) {
    const err = new Error('Vui lòng tải file hoặc dán link bảng kế hoạch sự kiện (Google Drive, OneDrive...).');
    err.statusCode = 400;
    throw err;
  }
};

const DIRECT_EDIT_STATUSES = ['draft', 'revision', 'rejected', 'cancelled', 'pending_icpdp', 'pending_admin', 'approved'];

const assertEditable = (timeline) => {
  if (!DIRECT_EDIT_STATUSES.includes(timeline.status)) {
    const err = new Error('Timeline chỉ có thể chỉnh sửa trực tiếp khi chưa được phê duyệt!');
    err.statusCode = 400;
    throw err;
  }
};

const resolveClubForManager = async (userId, activeClubId) => {
  const club = await resolveManagedClub(userId, activeClubId);
  if (!club) {
    const err = new Error('Không tìm thấy CLB bạn đang quản lý.');
    err.statusCode = 404;
    throw err;
  }
  return club;
};

const ensureUniqueSchoolSemester = async (ownerType, semesterTerm, semesterYear, excludeId = null) => {
  const filter = {
    ownerType,
    semesterTerm,
    semesterYear,
    status: { $in: ACTIVE_STATUSES.filter((s) => s !== 'rejected') },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await ClubSemesterTimeline.findOne(filter);
  if (existing) {
    const err = new Error('Đã có timeline cho học kỳ này. Vui lòng chỉnh sửa bản hiện có.');
    err.statusCode = 409;
    throw err;
  }
};

const assertSchoolRole = (role) => {
  const meta = SCHOOL_OWNER_META[role];
  if (!meta) {
    const err = new Error('Vai trò không được phép quản lý timeline đơn vị!');
    err.statusCode = 403;
    throw err;
  }
  return meta;
};

const assertSchoolTimeline = (timeline, role) => {
  const meta = assertSchoolRole(role);
  if (!timeline || (timeline.ownerType || 'club') !== meta.ownerType) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  return meta;
};
const ensureUniqueSemester = async (clubId, semesterTerm, semesterYear, excludeId = null) => {
  const filter = {
    clubId,
    ownerType: 'club',
    semesterTerm,
    semesterYear,
    status: { $in: ACTIVE_STATUSES.filter((s) => s !== 'rejected') },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await ClubSemesterTimeline.findOne(filter);
  if (existing) {
    const err = new Error('CLB đã có timeline cho học kỳ này. Vui lòng chỉnh sửa bản hiện có.');
    err.statusCode = 409;
    throw err;
  }
};

const processScheduledTimelineDeletes = async () => {
  const due = await ClubSemesterTimeline.find({
    'changeRequest.status': 'scheduled_delete',
    'changeRequest.scheduledDeleteAt': { $lte: new Date() },
  });
  for (const timeline of due) {
    await timeline.deleteOne();
  }
  bumpRegistry();
};

const listForClub = async (userId, activeClubId) => {
  await processScheduledTimelineDeletes();
  const club = await resolveClubForManager(userId, activeClubId);
  const User = require('../models/User');
  const user = await User.findById(userId).select('email').lean();
  const managedClubs = await findManagedClubs(userId);
  const managedClubIds = managedClubs.map((item) => item._id);
  const filter = managedClubIds.length > 1
    ? { clubId: club._id }
    : {
        $or: [
          { clubId: club._id },
          ...(user?.email
            ? [{ submittedByEmail: String(user.email).trim().toLowerCase(), clubId: { $nin: managedClubIds } }]
            : []),
        ],
      };
  const rows = await ClubSemesterTimeline.find(filter)
    .sort({ semesterYear: -1, createdAt: -1 });
  const formatted = await Promise.all(rows.map((row) => formatClubSemesterTimeline(row)));
  return formatted
    .sort((a, b) => {
      if (b.semesterYear !== a.semesterYear) return b.semesterYear - a.semesterYear;
      return (TERM_ORDER[b.semesterTerm] || 0) - (TERM_ORDER[a.semesterTerm] || 0);
    });
};

const getByIdForClub = async (id, userId, activeClubId) => {
  await processScheduledTimelineDeletes();
  const club = await resolveClubForManager(userId, activeClubId);
  const row = await ClubSemesterTimeline.findById(id);
  if (!row || String(row.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  return await formatClubSemesterTimeline(row, { includePlanFile: true });
};

const createForClub = async (payload, userId, activeClubId, submitterEmail = '') => {
  const club = await resolveClubForManager(userId, activeClubId);
  const semesterTerm = String(payload.semesterTerm || '').trim();
  const semesterYear = Number(payload.semesterYear);
  if (!VALID_TERMS.includes(semesterTerm)) {
    const err = new Error('Kỳ học không hợp lệ! Chọn Spring, Summer hoặc Fall.');
    err.statusCode = 400;
    throw err;
  }
  if (!semesterYear || semesterYear < 2020) {
    const err = new Error('Năm không hợp lệ!');
    err.statusCode = 400;
    throw err;
  }

  await ensureUniqueSemester(club._id, semesterTerm, semesterYear);

  const items = normalizeItems(payload.items);
  const timeline = await ClubSemesterTimeline.create({
    ownerType: 'club',
    ownerLabel: club.name,
    clubId: club._id,
    clubName: club.name,
    clubSlug: club.slug,
    semesterTerm,
    semesterYear,
    semesterLabel: buildSemesterLabel(semesterTerm, semesterYear),
    summary: String(payload.summary || '').trim(),
    objectives: String(payload.objectives || '').trim(),
    items,
    status: 'draft',
    submittedByEmail: String(submitterEmail || '').trim().toLowerCase(),
  });
  applyPlanFields(timeline, payload);
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline, { includePlanFile: true });
};

const updateForClub = async (id, payload, userId, activeClubId) => {
  const club = await resolveClubForManager(userId, activeClubId);
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline || String(timeline.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  assertEditable(timeline);
  const startReapproval = shouldStartReapprovalEdit(timeline);

  const nextTerm = payload.semesterTerm ? String(payload.semesterTerm).trim() : timeline.semesterTerm;
  const nextYear = payload.semesterYear ? Number(payload.semesterYear) : timeline.semesterYear;
  if (payload.semesterTerm && !VALID_TERMS.includes(nextTerm)) {
    const err = new Error('Kỳ học không hợp lệ! Chọn Spring, Summer hoặc Fall.');
    err.statusCode = 400;
    throw err;
  }
  if ((nextTerm !== timeline.semesterTerm || nextYear !== timeline.semesterYear)) {
    await ensureUniqueSemester(club._id, nextTerm, nextYear, timeline._id);
  }

  if (startReapproval) {
    beginReapprovalEdit(timeline, 'pending_icpdp');
  } else if (shouldClearStaleRejectedChange(timeline)) {
    clearChangeRequest(timeline);
  }

  timeline.semesterTerm = nextTerm;
  timeline.semesterYear = nextYear;
  timeline.semesterLabel = buildSemesterLabel(nextTerm, nextYear);
  if (payload.summary !== undefined) timeline.summary = String(payload.summary || '').trim();
  if (payload.objectives !== undefined) timeline.objectives = String(payload.objectives || '').trim();
  if (payload.items !== undefined) timeline.items = normalizeItems(payload.items);
  applyPlanFields(timeline, payload);
  timeline.clubName = club.name;
  timeline.clubSlug = club.slug;

  await timeline.save();
  return await formatClubSemesterTimeline(timeline, { includePlanFile: true });
};

const submitForClub = async (id, userId, activeClubId, submitterEmail = '') => {
  const club = await resolveClubForManager(userId, activeClubId);
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline || String(timeline.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  assertEditable(timeline);
  if (!timeline.items.length) {
    const err = new Error('Timeline cần ít nhất một hoạt động/sự kiện dự kiến!');
    err.statusCode = 400;
    throw err;
  }
  applyPlanFields(timeline, {}, { requirePlan: true });

  if (submitterEmail) {
    timeline.submittedByEmail = String(submitterEmail).trim().toLowerCase();
  }

  timeline.status = 'pending_icpdp';
  timeline.submittedAt = new Date();
  timeline.rejectionReason = '';
  timeline.icpdpNote = '';
  timeline.ctsvNote = '';
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline, { includePlanFile: true });
};

const shouldIncludePlanFile = (row) => {
  const status = row?.status;
  const changeStatus = row?.changeRequest?.status;
  return (
    ['pending_icpdp', 'pending_admin', 'approved'].includes(status) ||
    ['pending_icpdp', 'pending_admin'].includes(changeStatus)
  );
};

const listForReview = async ({ status, q, limit = 100, defaultStatuses, ownerType } = {}) => {
  await processScheduledTimelineDeletes();
  const filter = buildReviewListFilter(status, defaultStatuses, ownerType);
  if (q && String(q).trim()) {
    const re = new RegExp(String(q).trim(), 'i');
    filter.$and = (filter.$and || []).concat([
      { $or: [{ clubName: re }, { semesterLabel: re }, { summary: re }] },
    ]);
  }
  const rows = await ClubSemesterTimeline.find(filter).sort({ createdAt: -1 }).limit(limit);
  return Promise.all(
    rows.map((row) =>
      formatClubSemesterTimeline(row, { includePlanFile: shouldIncludePlanFile(row) })
    )
  );
};

const PENDING_ICPDP_CHANGE_FILTER = {
  status: 'approved',
  'changeRequest.status': 'pending_icpdp',
  'changeRequest.type': { $in: ['cancel', 'delete', 'edit'] },
};

const PENDING_ADMIN_CHANGE_FILTER = {
  status: 'approved',
  'changeRequest.status': 'pending_admin',
  'changeRequest.type': { $in: ['cancel', 'delete', 'edit'] },
};

const buildReviewListFilter = (status, defaultStatuses, ownerType) => {
  const parts = [];
  if (ownerType === 'all') {
    // no owner filter
  } else if (ownerType) {
    parts.push({ ownerType });
  } else {
    parts.push({ ownerType: 'club' });
  }

  if (status && status !== 'all') {
    if (status === 'pending_icpdp') {
      parts.push({ $or: [{ status: 'pending_icpdp' }, PENDING_ICPDP_CHANGE_FILTER] });
    } else if (status === 'pending_admin') {
      parts.push({ $or: [{ status: 'pending_admin' }, PENDING_ADMIN_CHANGE_FILTER] });
    } else if (status === 'approved') {
      parts.push({
        status: 'approved',
        $nor: [
          { 'changeRequest.status': 'pending_icpdp' },
          { 'changeRequest.status': 'pending_admin' },
        ],
      });
    } else {
      parts.push({ status });
    }
  } else if (defaultStatuses?.length) {
    const or = [{ status: { $in: defaultStatuses } }];
    if (defaultStatuses.includes('pending_icpdp')) or.push(PENDING_ICPDP_CHANGE_FILTER);
    if (defaultStatuses.includes('pending_admin')) or.push(PENDING_ADMIN_CHANGE_FILTER);
    parts.push({ $or: or });
  }

  if (!parts.length) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
};

const getById = async (id) => {
  await processScheduledTimelineDeletes();
  const row = await ClubSemesterTimeline.findById(id);
  if (!row) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  return await formatClubSemesterTimeline(row, { includePlanFile: true });
};

const getEventPlanById = async (id) => {
  const row = await ClubSemesterTimeline.findById(id)
    .select('eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink ownerType')
    .lean();
  if (!row) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  const { sanitizeEventPlanForApi, PLAN_SCOPES, buildPlanUrl } = require('../utils/eventPlanStorage');
  return sanitizeEventPlanForApi(row, PLAN_SCOPES.timelines, {
    planUrlBuilder: (entityId) => buildPlanUrl(PLAN_SCOPES.timelines, entityId),
  });
};

const getEventPlanByIdForClub = async (id, userId, activeClubId) => {
  const club = await resolveClubForManager(userId, activeClubId);
  const row = await ClubSemesterTimeline.findById(id)
    .select('clubId eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink ownerType')
    .lean();
  if (!row || String(row.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  const { sanitizeEventPlanForApi, PLAN_SCOPES, buildClubTimelinePlanUrl } = require('../utils/eventPlanStorage');
  return sanitizeEventPlanForApi(row, PLAN_SCOPES.timelines, {
    planUrlBuilder: buildClubTimelinePlanUrl,
  });
};

const icpdpApprove = async (id, { note, reviewerEmail } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if ((timeline.ownerType || 'club') !== 'club') {
    const err = new Error('Timeline đơn vị trường không qua bước IC-PDP!');
    err.statusCode = 400;
    throw err;
  }
  if (timeline.status !== 'pending_icpdp') {
    const err = new Error('Timeline không chờ IC-PDP duyệt!');
    err.statusCode = 400;
    throw err;
  }
  timeline.status = 'pending_admin';
  timeline.icpdpNote = String(note || '').trim();
  timeline.reviewedByEmail = reviewerEmail || '';
  timeline.reviewedAt = new Date();
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline);
};

const adminApprove = async (id, { note, reviewerEmail } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (timeline.status !== 'pending_admin') {
    const err = new Error('Timeline không chờ Admin duyệt!');
    err.statusCode = 400;
    throw err;
  }
  timeline.status = 'approved';
  timeline.everApproved = true;
  timeline.approvedSnapshot = null;
  timeline.editRejected = false;
  timeline.ctsvNote = String(note || '').trim();
  timeline.reviewedByEmail = reviewerEmail || '';
  timeline.reviewedAt = new Date();
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline);
};

const rejectTimeline = async (id, { reason, reviewerEmail, reviewerRole } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }

  const allowedStatuses =
    reviewerRole === 'admin'
      ? ['pending_admin']
      : ['pending_icpdp'];

  if (!allowedStatuses.includes(timeline.status)) {
    const err = new Error('Timeline không thể từ chối ở trạng thái hiện tại!');
    err.statusCode = 400;
    throw err;
  }
  const trimmed = String(reason || '').trim();
  if (!trimmed) {
    const err = new Error('Vui lòng nhập lý do từ chối!');
    err.statusCode = 400;
    throw err;
  }
  if (isReapprovalRejection(timeline, reviewerRole)) {
    restoreApprovedSnapshot(timeline);
    timeline.status = 'approved';
    timeline.editRejected = true;
    timeline.rejectionReason = '';
    if (reviewerRole === 'admin') {
      timeline.ctsvNote = trimmed;
    } else {
      timeline.icpdpNote = trimmed;
    }
    timeline.reviewedByEmail = reviewerEmail || '';
    timeline.reviewedAt = new Date();
    await timeline.save();
    bumpRegistry();
    return await formatClubSemesterTimeline(timeline);
  }
  timeline.status = 'rejected';
  timeline.rejectionReason = trimmed;
  timeline.icpdpNote = '';
  if (!hasPendingChangeRequest(timeline)) {
    clearChangeRequest(timeline);
  }
  timeline.reviewedByEmail = reviewerEmail || '';
  timeline.reviewedAt = new Date();
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline);
};

const requestRevision = async (id, { note, reviewerEmail } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if ((timeline.ownerType || 'club') !== 'club') {
    const err = new Error('Timeline đơn vị trường không qua bước yêu cầu chỉnh sửa IC-PDP!');
    err.statusCode = 400;
    throw err;
  }
  if (timeline.status !== 'pending_icpdp') {
    const err = new Error('Chỉ có thể yêu cầu chỉnh sửa timeline đang chờ duyệt!');
    err.statusCode = 400;
    throw err;
  }
  const trimmed = String(note || '').trim();
  if (!trimmed) {
    const err = new Error('Vui lòng nhập ghi chú yêu cầu chỉnh sửa!');
    err.statusCode = 400;
    throw err;
  }
  timeline.rejectionReason = '';
  timeline.icpdpNote = trimmed;
  timeline.status = 'revision';
  if (!hasPendingChangeRequest(timeline)) {
    clearChangeRequest(timeline);
  }
  timeline.reviewedByEmail = reviewerEmail || '';
  timeline.reviewedAt = new Date();
  await timeline.save();
  return await formatClubSemesterTimeline(timeline);
};

const clearChangeRequest = (timeline) => {
  timeline.set('changeRequest', {
    type: 'none',
    status: 'none',
    reason: '',
    payload: null,
    requestedAt: null,
    icpdpNote: '',
    adminNote: '',
    reviewedAt: null,
    scheduledDeleteAt: null,
  });
  timeline.markModified('changeRequest');
};

const hasPendingChangeRequest = (timeline) =>
  timeline.changeRequest?.type &&
  timeline.changeRequest.type !== 'none' &&
  ['pending_icpdp', 'pending_admin', 'scheduled_delete'].includes(timeline.changeRequest.status);

const deleteForClub = async (id, userId, activeClubId) => {
  const club = await resolveClubForManager(userId, activeClubId);
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline || String(timeline.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (!['draft', 'revision', 'rejected', 'pending_icpdp', 'cancelled'].includes(timeline.status)) {
    const err = new Error('Không thể xóa timeline ở trạng thái này!');
    err.statusCode = 400;
    throw err;
  }
  if (timeline.status === 'pending_icpdp' && timelineWasEverApproved(timeline)) {
    const err = new Error('Timeline đã từng được duyệt. Vui lòng gửi yêu cầu hủy đơn để Admin phê duyệt.');
    err.statusCode = 400;
    throw err;
  }
  if (['draft', 'rejected', 'cancelled'].includes(timeline.status)) {
    await timeline.deleteOne();
    return { id: String(id), deleted: true, mode: 'hard' };
  }
  timeline.status = 'cancelled';
  timeline.rejectionReason = 'CLB đã hủy đơn timeline.';
  timeline.reviewedAt = new Date();
  await timeline.save();
  return { id: String(id), deleted: true, mode: 'cancelled', timeline: formatClubSemesterTimeline(timeline) };
};

const requestChangeForClub = async (id, { type, reason, payload }, userId, activeClubId) => {
  const club = await resolveClubForManager(userId, activeClubId);
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline || String(timeline.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (hasPendingChangeRequest(timeline)) {
    const err = new Error('Timeline đang có yêu cầu chờ duyệt!');
    err.statusCode = 400;
    throw err;
  }

  const action = String(type || '').trim();
  if (!['cancel', 'delete'].includes(action)) {
    const err = new Error('Loại yêu cầu không hợp lệ!');
    err.statusCode = 400;
    throw err;
  }

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    const err = new Error('Vui lòng nhập lý do yêu cầu!');
    err.statusCode = 400;
    throw err;
  }

  if (action === 'cancel' && timeline.status !== 'approved') {
    const reapprovalPending =
      timelineWasEverApproved(timeline) &&
      ['pending_icpdp', 'pending_admin'].includes(timeline.status);
    if (!reapprovalPending) {
      const err = new Error('Chỉ timeline đã duyệt mới cần gửi yêu cầu hủy kèm lý do!');
      err.statusCode = 400;
      throw err;
    }
  }

  if (action === 'delete' && timeline.status !== 'approved') {
    const reapprovalPending =
      timelineWasEverApproved(timeline) &&
      ['pending_icpdp', 'pending_admin'].includes(timeline.status);
    if (!reapprovalPending) {
      const err = new Error('Chỉ timeline đã duyệt mới cần gửi yêu cầu xóa kèm lý do!');
      err.statusCode = 400;
      throw err;
    }
  }

  if (timelineWasEverApproved(timeline) && ['pending_icpdp', 'pending_admin'].includes(timeline.status)) {
    timeline.status = 'approved';
  }

  timeline.changeRequest = {
    type: action,
    status: 'pending_icpdp',
    reason: trimmedReason,
    payload: null,
    requestedAt: new Date(),
    icpdpNote: '',
    adminNote: '',
    reviewedAt: null,
  };
  await timeline.save();
  return await formatClubSemesterTimeline(timeline);
};

const withdrawForClub = async (id, userId, activeClubId) => {
  const club = await resolveClubForManager(userId, activeClubId);
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline || String(timeline.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (timeline.status !== 'pending_icpdp') {
    const err = new Error('Chỉ có thể thu hồi đơn đang chờ duyệt!');
    err.statusCode = 400;
    throw err;
  }
  if (hasPendingChangeRequest(timeline)) {
    const err = new Error('Timeline đang có yêu cầu chờ duyệt!');
    err.statusCode = 400;
    throw err;
  }
  if (timelineWasEverApproved(timeline)) {
    if (timeline.approvedSnapshot) {
      restoreApprovedSnapshot(timeline);
    }
    timeline.status = 'approved';
    timeline.submittedAt = timeline.reviewedAt || timeline.submittedAt;
    timeline.rejectionReason = '';
    if (hasStaleRejectedChange(timeline)) {
      clearChangeRequest(timeline);
    }
  } else {
    timeline.status = 'draft';
    timeline.submittedAt = null;
  }
  await timeline.save();
  return await formatClubSemesterTimeline(timeline);
};

const applyApprovedChange = async (timeline) => {
  const { type } = timeline.changeRequest || {};
  if (type === 'cancel') {
    timeline.status = 'cancelled';
  }
  clearChangeRequest(timeline);
  await timeline.save();
  return await formatClubSemesterTimeline(timeline);
};

const icpdpApproveChangeRequest = async (id, { note, reviewerEmail } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (timeline.changeRequest?.status !== 'pending_icpdp') {
    const err = new Error('Không có yêu cầu chờ IC-PDP duyệt!');
    err.statusCode = 400;
    throw err;
  }
  timeline.changeRequest.status = 'pending_admin';
  timeline.changeRequest.icpdpNote = String(note || '').trim();
  timeline.changeRequest.reviewedAt = new Date();
  timeline.reviewedByEmail = reviewerEmail || '';
  await timeline.save();
  return await formatClubSemesterTimeline(timeline);
};

const adminApproveChangeRequest = async (id, { note, reviewerEmail } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (timeline.changeRequest?.status !== 'pending_admin') {
    const err = new Error('Không có yêu cầu chờ Admin duyệt!');
    err.statusCode = 400;
    throw err;
  }
  timeline.changeRequest.adminNote = String(note || '').trim();
  timeline.changeRequest.reviewedAt = new Date();
  timeline.reviewedByEmail = reviewerEmail || '';
  if (timeline.changeRequest.type === 'delete') {
    timeline.changeRequest.status = 'scheduled_delete';
    timeline.changeRequest.scheduledDeleteAt = new Date(Date.now() + DELETE_GRACE_MS);
    await timeline.save();
    return await formatClubSemesterTimeline(timeline);
  }
  timeline.changeRequest.status = 'approved';
  return applyApprovedChange(timeline);
};

const rejectChangeRequest = async (id, { reason, reviewerEmail, stage } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  const crStatus = timeline.changeRequest?.status;
  if (!['pending_icpdp', 'pending_admin'].includes(crStatus)) {
    const err = new Error('Không có yêu cầu đang chờ duyệt!');
    err.statusCode = 400;
    throw err;
  }
  if (stage === 'icpdp' && crStatus !== 'pending_icpdp') {
    const err = new Error('Yêu cầu không chờ IC-PDP!');
    err.statusCode = 400;
    throw err;
  }
  if (stage === 'admin' && crStatus !== 'pending_admin') {
    const err = new Error('Yêu cầu không chờ Admin!');
    err.statusCode = 400;
    throw err;
  }
  const trimmed = String(reason || '').trim();
  if (!trimmed) {
    const err = new Error('Vui lòng nhập lý do từ chối!');
    err.statusCode = 400;
    throw err;
  }
  if (stage === 'icpdp') timeline.changeRequest.icpdpNote = trimmed;
  if (stage === 'admin') timeline.changeRequest.adminNote = trimmed;
  timeline.changeRequest.status = 'rejected';
  timeline.changeRequest.reviewedAt = new Date();
  timeline.reviewedByEmail = reviewerEmail || '';
  await timeline.save();
  return await formatClubSemesterTimeline(timeline);
};

const cancelScheduledDeleteForClub = async (id, userId, activeClubId) => {
  const club = await resolveClubForManager(userId, activeClubId);
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline || String(timeline.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (timeline.changeRequest?.status !== 'scheduled_delete') {
    const err = new Error('Timeline không có lịch xóa đang chờ!');
    err.statusCode = 400;
    throw err;
  }
  clearChangeRequest(timeline);
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline);
};

const assertWithdrawablePendingChangeRequest = (timeline) => {
  const cr = timeline.changeRequest;
  if (!cr || !['cancel', 'delete'].includes(cr.type)) {
    const err = new Error('Không có yêu cầu đang chờ!');
    err.statusCode = 400;
    throw err;
  }
  if (!['pending_icpdp', 'pending_admin'].includes(cr.status)) {
    const err = new Error('Yêu cầu không còn chờ duyệt!');
    err.statusCode = 400;
    throw err;
  }
  if (!timelineWasEverApproved(timeline)) {
    const err = new Error('Chỉ có thể hoàn tác yêu cầu của timeline đã từng được duyệt!');
    err.statusCode = 400;
    throw err;
  }
};

const withdrawCancelChangeRequestForClub = async (id, userId, activeClubId) => {
  const club = await resolveClubForManager(userId, activeClubId);
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline || String(timeline.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  assertWithdrawablePendingChangeRequest(timeline);
  clearChangeRequest(timeline);
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline);
};

// --- School unit (ICPDP / CTSV) timelines — submit goes straight to Admin ---

const listForSchoolUnit = async (role) => {
  const meta = assertSchoolRole(role);
  await processScheduledTimelineDeletes();
  const rows = await ClubSemesterTimeline.find({ ownerType: meta.ownerType }).sort({
    semesterYear: -1,
    createdAt: -1,
  });
  const formatted = await Promise.all(rows.map((row) => formatClubSemesterTimeline(row)));
  return formatted.sort((a, b) => {
    if (b.semesterYear !== a.semesterYear) return b.semesterYear - a.semesterYear;
    return (TERM_ORDER[b.semesterTerm] || 0) - (TERM_ORDER[a.semesterTerm] || 0);
  });
};

const getByIdForSchoolUnit = async (id, role) => {
  await processScheduledTimelineDeletes();
  const row = await ClubSemesterTimeline.findById(id);
  assertSchoolTimeline(row, role);
  return await formatClubSemesterTimeline(row, { includePlanFile: true });
};

const getEventPlanByIdForSchoolUnit = async (id, role) => {
  const row = await ClubSemesterTimeline.findById(id)
    .select('ownerType eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink')
    .lean();
  assertSchoolTimeline(row, role);
  const { sanitizeEventPlanForApi, PLAN_SCOPES, buildSchoolTimelinePlanUrl } = require('../utils/eventPlanStorage');
  return sanitizeEventPlanForApi(row, PLAN_SCOPES.timelines, {
    planUrlBuilder: buildSchoolTimelinePlanUrl,
  });
};

const sendTimelinePlanFile = async (id, res, { forClub = false, userId, activeClubId, role } = {}) => {
  const { sendPlanFile, PLAN_SCOPES } = require('../utils/eventPlanStorage');
  let row;
  if (forClub) {
    const club = await resolveClubForManager(userId, activeClubId);
    row = await ClubSemesterTimeline.findById(id)
      .select('clubId eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink')
      .lean();
    if (!row || String(row.clubId) !== String(club._id)) {
      const err = new Error('Không tìm thấy file kế hoạch!');
      err.statusCode = 404;
      throw err;
    }
  } else if (role) {
    row = await ClubSemesterTimeline.findById(id)
      .select('ownerType eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink')
      .lean();
    assertSchoolTimeline(row, role);
  } else {
    row = await ClubSemesterTimeline.findById(id)
      .select('eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink')
      .lean();
    if (!row) {
      const err = new Error('Không tìm thấy file kế hoạch!');
      err.statusCode = 404;
      throw err;
    }
  }
  await sendPlanFile(row, PLAN_SCOPES.timelines, res);
};

const createForSchoolUnit = async (role, payload, submitterEmail = '') => {
  const meta = assertSchoolRole(role);
  const semesterTerm = String(payload.semesterTerm || '').trim();
  const semesterYear = Number(payload.semesterYear);
  if (!VALID_TERMS.includes(semesterTerm)) {
    const err = new Error('Kỳ học không hợp lệ!');
    err.statusCode = 400;
    throw err;
  }
  await ensureUniqueSchoolSemester(meta.ownerType, semesterTerm, semesterYear);
  const timeline = await ClubSemesterTimeline.create({
    ownerType: meta.ownerType,
    ownerLabel: meta.ownerLabel,
    clubName: meta.ownerLabel,
    semesterTerm,
    semesterYear,
    semesterLabel: buildSemesterLabel(semesterTerm, semesterYear),
    summary: String(payload.summary || '').trim(),
    objectives: String(payload.objectives || '').trim(),
    items: normalizeItems(payload.items),
    status: 'draft',
    submittedByEmail: String(submitterEmail || '').trim().toLowerCase(),
  });
  applyPlanFields(timeline, payload);
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline, { includePlanFile: true });
};

const updateForSchoolUnit = async (id, role, payload) => {
  const meta = assertSchoolRole(role);
  const timeline = await ClubSemesterTimeline.findById(id);
  assertSchoolTimeline(timeline, role);
  assertEditable(timeline);
  const startReapproval = shouldStartReapprovalEdit(timeline);
  const nextTerm = payload.semesterTerm ? String(payload.semesterTerm).trim() : timeline.semesterTerm;
  const nextYear = payload.semesterYear ? Number(payload.semesterYear) : timeline.semesterYear;
  if (payload.semesterTerm && !VALID_TERMS.includes(nextTerm)) {
    const err = new Error('Kỳ học không hợp lệ!');
    err.statusCode = 400;
    throw err;
  }
  if (nextTerm !== timeline.semesterTerm || nextYear !== timeline.semesterYear) {
    await ensureUniqueSchoolSemester(meta.ownerType, nextTerm, nextYear, timeline._id);
  }

  if (startReapproval) {
    beginReapprovalEdit(timeline, 'pending_admin');
  } else if (shouldClearStaleRejectedChange(timeline)) {
    clearChangeRequest(timeline);
  }

  timeline.semesterTerm = nextTerm;
  timeline.semesterYear = nextYear;
  timeline.semesterLabel = buildSemesterLabel(nextTerm, nextYear);
  if (payload.summary !== undefined) timeline.summary = String(payload.summary || '').trim();
  if (payload.objectives !== undefined) timeline.objectives = String(payload.objectives || '').trim();
  if (payload.items !== undefined) timeline.items = normalizeItems(payload.items);
  applyPlanFields(timeline, payload);
  timeline.ownerLabel = meta.ownerLabel;
  timeline.clubName = meta.ownerLabel;

  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline, { includePlanFile: true });
};

const submitForSchoolUnit = async (id, role, submitterEmail = '') => {
  const timeline = await ClubSemesterTimeline.findById(id);
  assertSchoolTimeline(timeline, role);
  assertEditable(timeline);
  if (!timeline.items.length) {
    const err = new Error('Timeline cần ít nhất một hoạt động/sự kiện dự kiến!');
    err.statusCode = 400;
    throw err;
  }
  applyPlanFields(timeline, {}, { requirePlan: true });
  if (submitterEmail) {
    timeline.submittedByEmail = String(submitterEmail).trim().toLowerCase();
  }
  timeline.status = 'pending_admin';
  timeline.submittedAt = new Date();
  timeline.rejectionReason = '';
  timeline.icpdpNote = '';
  timeline.ctsvNote = '';
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline, { includePlanFile: true });
};

const deleteForSchoolUnit = async (id, role) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  assertSchoolTimeline(timeline, role);
  if (!['draft', 'revision', 'rejected', 'pending_admin'].includes(timeline.status)) {
    const err = new Error('Chỉ có thể xóa timeline ở trạng thái bản nháp, từ chối, chờ duyệt hoặc yêu cầu chỉnh sửa!');
    err.statusCode = 400;
    throw err;
  }
  if (['draft', 'rejected'].includes(timeline.status)) {
    await timeline.deleteOne();
    bumpRegistry();
    return { id: String(id), deleted: true, mode: 'hard' };
  }
  if (timeline.status === 'pending_admin' && timelineWasEverApproved(timeline)) {
    const err = new Error('Timeline đã từng được duyệt. Vui lòng gửi yêu cầu hủy đơn để Admin phê duyệt.');
    err.statusCode = 400;
    throw err;
  }
  timeline.status = 'cancelled';
  timeline.rejectionReason = 'Đơn vị đã hủy timeline kỳ học.';
  timeline.reviewedAt = new Date();
  await timeline.save();
  bumpRegistry();
  return { id: String(id), deleted: true, mode: 'cancelled', timeline: await formatClubSemesterTimeline(timeline) };
};

const withdrawForSchoolUnit = async (id, role) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  assertSchoolTimeline(timeline, role);
  if (timeline.status !== 'pending_admin') {
    const err = new Error('Chỉ có thể thu hồi đơn đang chờ duyệt!');
    err.statusCode = 400;
    throw err;
  }
  if (hasPendingChangeRequest(timeline)) {
    const err = new Error('Timeline đang có yêu cầu chờ duyệt!');
    err.statusCode = 400;
    throw err;
  }
  if (timelineWasEverApproved(timeline)) {
    if (timeline.approvedSnapshot) {
      restoreApprovedSnapshot(timeline);
    }
    timeline.status = 'approved';
    timeline.submittedAt = timeline.reviewedAt || timeline.submittedAt;
    timeline.rejectionReason = '';
    if (hasStaleRejectedChange(timeline)) {
      clearChangeRequest(timeline);
    }
  } else {
    timeline.status = 'draft';
    timeline.submittedAt = null;
  }
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline);
};

const requestChangeForSchoolUnit = async (id, { type, reason }, role) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  assertSchoolTimeline(timeline, role);
  if (hasPendingChangeRequest(timeline)) {
    const err = new Error('Timeline đang có yêu cầu chờ duyệt!');
    err.statusCode = 400;
    throw err;
  }
  const action = String(type || '').trim();
  if (!['cancel', 'delete'].includes(action)) {
    const err = new Error('Loại yêu cầu không hợp lệ!');
    err.statusCode = 400;
    throw err;
  }
  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    const err = new Error('Vui lòng nhập lý do yêu cầu!');
    err.statusCode = 400;
    throw err;
  }
  if (timeline.status !== 'approved') {
    const reapprovalPending =
      timelineWasEverApproved(timeline) && timeline.status === 'pending_admin';
    if (!reapprovalPending) {
      const err = new Error('Chỉ timeline đã duyệt mới cần gửi yêu cầu thay đổi kèm lý do!');
      err.statusCode = 400;
      throw err;
    }
  }
  if (timelineWasEverApproved(timeline) && timeline.status === 'pending_admin') {
    timeline.status = 'approved';
  }
  timeline.changeRequest = {
    type: action,
    status: 'pending_admin',
    reason: trimmedReason,
    payload: null,
    requestedAt: new Date(),
    icpdpNote: '',
    adminNote: '',
    reviewedAt: null,
  };
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline);
};

const cancelScheduledDeleteForSchoolUnit = async (id, role) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  assertSchoolTimeline(timeline, role);
  if (timeline.changeRequest?.status !== 'scheduled_delete') {
    const err = new Error('Timeline không có lịch xóa đang chờ!');
    err.statusCode = 400;
    throw err;
  }
  clearChangeRequest(timeline);
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline);
};

const withdrawCancelChangeRequestForSchoolUnit = async (id, role) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  assertSchoolTimeline(timeline, role);
  assertWithdrawablePendingChangeRequest(timeline);
  clearChangeRequest(timeline);
  await timeline.save();
  bumpRegistry();
  return await formatClubSemesterTimeline(timeline);
};

const assertApprovedTimelineForSchoolUnit = async (role, timelineId) => {
  const meta = assertSchoolRole(role);
  const filter = { ownerType: meta.ownerType, status: 'approved' };
  if (timelineId) {
    filter._id = timelineId;
    const row = await ClubSemesterTimeline.findOne(filter).select('_id semesterLabel').lean();
    if (!row) {
      const err = new Error('Timeline kỳ học đã chọn không hợp lệ hoặc chưa được phê duyệt.');
      err.statusCode = 400;
      throw err;
    }
    return row;
  }
  const approved = await ClubSemesterTimeline.findOne(filter).select('_id semesterLabel').lean();
  if (!approved) {
    const err = new Error(`${meta.ownerLabel} cần có timeline kỳ học đã được phê duyệt trước khi tạo sự kiện.`);
    err.statusCode = 400;
    throw err;
  }
  return approved;
};

module.exports = {
  listForClub,
  getByIdForClub,
  createForClub,
  updateForClub,
  submitForClub,
  deleteForClub,
  withdrawForClub,
  requestChangeForClub,
  listForReview,
  getById,
  getEventPlanById,
  getEventPlanByIdForClub,
  icpdpApprove,
  adminApprove,
  rejectTimeline,
  requestRevision,
  icpdpApproveChangeRequest,
  adminApproveChangeRequest,
  rejectChangeRequest,
  cancelScheduledDeleteForClub,
  withdrawCancelChangeRequestForClub,
  formatTimelineItem,
  listForSchoolUnit,
  getByIdForSchoolUnit,
  getEventPlanByIdForSchoolUnit,
  sendTimelinePlanFile,
  createForSchoolUnit,
  updateForSchoolUnit,
  submitForSchoolUnit,
  deleteForSchoolUnit,
  withdrawForSchoolUnit,
  requestChangeForSchoolUnit,
  cancelScheduledDeleteForSchoolUnit,
  withdrawCancelChangeRequestForSchoolUnit,
  assertApprovedTimelineForSchoolUnit,
};
