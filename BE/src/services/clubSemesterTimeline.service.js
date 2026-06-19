const ClubSemesterTimeline = require('../models/ClubSemesterTimeline');
const { resolveManagedClub, findManagedClubs } = require('./club.service');
const {
  buildSemesterLabel,
  formatClubSemesterTimeline,
  formatTimelineItem,
  TERM_ORDER,
} = require('../utils/clubSemesterTimelineFormat');

const VALID_TERMS = ['spring', 'summer', 'fall'];

const ACTIVE_STATUSES = ['draft', 'pending_icpdp', 'pending_admin', 'approved', 'revision'];

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      plannedDate: item.plannedDate ? new Date(item.plannedDate) : null,
      category: String(item.category || 'Workshop').trim(),
      location: String(item.location || '').trim(),
      expectedAttendees: Math.max(0, Number(item.expectedAttendees) || 0),
      notes: String(item.notes || '').trim(),
    }))
    .filter((item) => item.title);
};

const DIRECT_EDIT_STATUSES = ['draft', 'revision', 'pending_icpdp', 'pending_admin'];

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

const ensureUniqueSemester = async (clubId, semesterTerm, semesterYear, excludeId = null) => {
  const filter = {
    clubId,
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

const listForClub = async (userId, activeClubId) => {
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
  return rows
    .map(formatClubSemesterTimeline)
    .sort((a, b) => {
      if (b.semesterYear !== a.semesterYear) return b.semesterYear - a.semesterYear;
      return (TERM_ORDER[b.semesterTerm] || 0) - (TERM_ORDER[a.semesterTerm] || 0);
    });
};

const getByIdForClub = async (id, userId, activeClubId) => {
  const club = await resolveClubForManager(userId, activeClubId);
  const row = await ClubSemesterTimeline.findById(id);
  if (!row || String(row.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  return formatClubSemesterTimeline(row);
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
  return formatClubSemesterTimeline(timeline);
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

  timeline.semesterTerm = nextTerm;
  timeline.semesterYear = nextYear;
  timeline.semesterLabel = buildSemesterLabel(nextTerm, nextYear);
  if (payload.summary !== undefined) timeline.summary = String(payload.summary || '').trim();
  if (payload.objectives !== undefined) timeline.objectives = String(payload.objectives || '').trim();
  if (payload.items !== undefined) timeline.items = normalizeItems(payload.items);
  timeline.clubName = club.name;
  timeline.clubSlug = club.slug;
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
};

const submitForClub = async (id, userId, activeClubId) => {
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

  timeline.status = 'pending_icpdp';
  timeline.submittedAt = new Date();
  timeline.rejectionReason = '';
  timeline.icpdpNote = '';
  timeline.ctsvNote = '';
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
};

const listForReview = async ({ status, q, limit = 100, defaultStatuses } = {}) => {
  const filter = {};
  if (status && status !== 'all') {
    filter.status = status;
  } else if (defaultStatuses?.length) {
    filter.status = { $in: defaultStatuses };
  }
  if (q && String(q).trim()) {
    const re = new RegExp(String(q).trim(), 'i');
    filter.$or = [{ clubName: re }, { semesterLabel: re }, { summary: re }];
  }
  const rows = await ClubSemesterTimeline.find(filter).sort({ createdAt: -1 }).limit(limit);
  return rows.map(formatClubSemesterTimeline);
};

const getById = async (id) => {
  const row = await ClubSemesterTimeline.findById(id);
  if (!row) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  return formatClubSemesterTimeline(row);
};

const icpdpApprove = async (id, { note, reviewerEmail } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
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
  return formatClubSemesterTimeline(timeline);
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
  timeline.ctsvNote = String(note || '').trim();
  timeline.reviewedByEmail = reviewerEmail || '';
  timeline.reviewedAt = new Date();
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
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
  timeline.status = 'rejected';
  timeline.rejectionReason = trimmed;
  timeline.reviewedByEmail = reviewerEmail || '';
  timeline.reviewedAt = new Date();
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
};

const requestRevision = async (id, { note, reviewerEmail } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
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
  timeline.icpdpNote = trimmed;
  timeline.status = 'revision';
  timeline.reviewedByEmail = reviewerEmail || '';
  timeline.reviewedAt = new Date();
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
};

const clearChangeRequest = (timeline) => {
  timeline.changeRequest = {
    type: 'none',
    status: 'none',
    reason: '',
    payload: null,
    requestedAt: null,
    icpdpNote: '',
    adminNote: '',
    reviewedAt: null,
  };
};

const hasPendingChangeRequest = (timeline) =>
  timeline.changeRequest?.type &&
  timeline.changeRequest.type !== 'none' &&
  ['pending_icpdp', 'pending_admin'].includes(timeline.changeRequest.status);

const deleteForClub = async (id, userId, activeClubId) => {
  const club = await resolveClubForManager(userId, activeClubId);
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline || String(timeline.clubId) !== String(club._id)) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (timeline.status !== 'draft') {
    const err = new Error('Chỉ có thể xóa trực tiếp timeline ở trạng thái bản nháp!');
    err.statusCode = 400;
    throw err;
  }
  await timeline.deleteOne();
  return { id: String(id), deleted: true };
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
  if (!['cancel', 'edit', 'delete'].includes(action)) {
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
    const err = new Error('Chỉ timeline đã duyệt mới cần gửi yêu cầu hủy kèm lý do!');
    err.statusCode = 400;
    throw err;
  }

  if (action === 'delete' && timeline.status !== 'approved') {
    const err = new Error('Chỉ timeline đã duyệt mới cần gửi yêu cầu xóa kèm lý do!');
    err.statusCode = 400;
    throw err;
  }

  if (action === 'edit') {
    if (timeline.status !== 'approved') {
      const err = new Error('Chỉ có thể gửi yêu cầu sửa timeline đã được phê duyệt!');
      err.statusCode = 400;
      throw err;
    }
    const items = normalizeItems(payload?.items || []);
    if (!items.length) {
      const err = new Error('Yêu cầu sửa cần ít nhất một hoạt động!');
      err.statusCode = 400;
      throw err;
    }
  }

  timeline.changeRequest = {
    type: action,
    status: 'pending_icpdp',
    reason: trimmedReason,
    payload: action === 'edit' ? payload : null,
    requestedAt: new Date(),
    icpdpNote: '',
    adminNote: '',
    reviewedAt: null,
  };
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
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
  timeline.status = 'draft';
  timeline.submittedAt = null;
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
};

const applyApprovedChange = async (timeline) => {
  const { type, payload } = timeline.changeRequest || {};
  if (type === 'cancel') {
    timeline.status = 'cancelled';
  } else if (type === 'delete') {
    await timeline.deleteOne();
    return { id: String(timeline._id), deleted: true };
  } else if (type === 'edit' && payload) {
    if (payload.summary !== undefined) timeline.summary = String(payload.summary || '').trim();
    if (payload.objectives !== undefined) timeline.objectives = String(payload.objectives || '').trim();
    if (payload.items !== undefined) timeline.items = normalizeItems(payload.items);
    timeline.status = 'pending_icpdp';
    timeline.submittedAt = new Date();
    timeline.rejectionReason = '';
    timeline.icpdpNote = '';
    timeline.ctsvNote = '';
  }
  clearChangeRequest(timeline);
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
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
  return formatClubSemesterTimeline(timeline);
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
  timeline.changeRequest.status = 'approved';
  timeline.changeRequest.adminNote = String(note || '').trim();
  timeline.changeRequest.reviewedAt = new Date();
  timeline.reviewedByEmail = reviewerEmail || '';
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
  timeline.reviewedByEmail = reviewerEmail || '';
  clearChangeRequest(timeline);
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
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
  icpdpApprove,
  adminApprove,
  rejectTimeline,
  requestRevision,
  icpdpApproveChangeRequest,
  adminApproveChangeRequest,
  rejectChangeRequest,
  formatTimelineItem,
};
