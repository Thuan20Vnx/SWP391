const ClubSemesterTimeline = require('../models/ClubSemesterTimeline');
const { resolveManagedClub } = require('./club.service');
const {
  buildSemesterLabel,
  formatClubSemesterTimeline,
  formatTimelineItem,
  TERM_ORDER,
} = require('../utils/clubSemesterTimelineFormat');

const VALID_TERMS = ['spring', 'summer', 'fall'];

const ACTIVE_STATUSES = ['draft', 'pending_icpdp', 'pending_ctsv', 'approved', 'revision'];

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

const assertEditable = (timeline) => {
  if (!['draft', 'revision'].includes(timeline.status)) {
    const err = new Error('Timeline chỉ có thể chỉnh sửa khi ở trạng thái bản nháp hoặc cần chỉnh sửa!');
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
  const rows = await ClubSemesterTimeline.find({ clubId: club._id })
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
  timeline.status = 'pending_ctsv';
  timeline.icpdpNote = String(note || '').trim();
  timeline.reviewedByEmail = reviewerEmail || '';
  timeline.reviewedAt = new Date();
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
};

const ctsvApprove = async (id, { note, reviewerEmail } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (timeline.status !== 'pending_ctsv') {
    const err = new Error('Timeline không chờ CTSV duyệt!');
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

const rejectTimeline = async (id, { reason, reviewerEmail } = {}) => {
  const timeline = await ClubSemesterTimeline.findById(id);
  if (!timeline) {
    const err = new Error('Không tìm thấy timeline kỳ học!');
    err.statusCode = 404;
    throw err;
  }
  if (!['pending_icpdp', 'pending_ctsv'].includes(timeline.status)) {
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
  if (!['pending_icpdp', 'pending_ctsv'].includes(timeline.status)) {
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
  if (timeline.status === 'pending_icpdp') {
    timeline.icpdpNote = trimmed;
  }
  if (timeline.status === 'pending_ctsv') {
    timeline.ctsvNote = trimmed;
  }
  timeline.status = 'revision';
  timeline.reviewedByEmail = reviewerEmail || '';
  timeline.reviewedAt = new Date();
  await timeline.save();
  return formatClubSemesterTimeline(timeline);
};

module.exports = {
  listForClub,
  getByIdForClub,
  createForClub,
  updateForClub,
  submitForClub,
  listForReview,
  getById,
  icpdpApprove,
  ctsvApprove,
  rejectTimeline,
  requestRevision,
  formatTimelineItem,
};
