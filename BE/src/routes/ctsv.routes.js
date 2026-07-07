const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  requireCtsvPortal,
  requireCtsvApprove,
  requireSchoolEventSubmit,
  requireProposalModerate,
  requireIcpdpOrCtsv,
  requireIcpdp,
  requireIcpdpTimeline,
  requireAdmin,
} = require('../middleware/requireRole');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventProposal = require('../models/EventProposal');
const Partner = require('../models/Partner');
const { PARTNER_STATUSES } = require('../models/Partner');
const Contract = require('../models/Contract');
const Announcement = require('../models/Announcement');
const { normalizeEventCategory } = require('../constants/eventCategories');
const { formatEvent, formatProposal } = require('../utils/eventFormat');
const { hydrateProposalPlanFromLinkedEvent, hydrateEventsPlanFromProposals } = require('../utils/eventPlanHydrate');
const { normalizeSpeakers } = require('../constants/eventSpeaker');
const {
  buildSchoolEventSubmitMeta,
  canCtsvEditSchoolEvent,
  shouldResubmitSchoolEventForAdmin,
  resolveSchoolOrganizerRole,
  canRoleManageSchoolEvent,
  SCHOOL_EVENT_SUBMIT_STATUS
} = require('../constants/eventWorkflow');
const { getCtsvReportDetail } = require('../services/ctsvReport.service');
const reviewService = require('../services/review.service');
const {
  submitCtsvReport,
  getSubmissionMeta,
} = require('../services/ctsvReportSubmission.service');
const SubmittedCtsvReport = require('../models/SubmittedCtsvReport');
const { resolveReportPhase, getReportDisplayStatus } = require('../constants/ctsvReportDisplay');
const {
  findLinkableAnnouncementEvents,
  isEventLinkableForAnnouncement
} = require('../utils/announcementEvents');
const clubSemesterTimelineService = require('../services/clubSemesterTimeline.service');
const {
  checkItemConflicts,
  checkEventVenueConflicts,
  previewFormConflicts,
} = require('../services/timelineLocationConflict.service');
const {
  requestModeration,
  requestClubModeration,
  approveIcpdpModeration,
  rejectIcpdpModeration
} = require('../services/eventModeration.service');
const {
  normalizeTicketTypes,
  deriveTicketPriceFromTypes,
  totalQtyFromTypes
} = require('../utils/ticketTypes');
const { normalizeLearningOutcomes } = require('../utils/learningOutcomes');
const { buildEventTextSearchOr } = require('../utils/eventSearch');
const { createAndBroadcast } = require('../services/notification.service');
const AppError = require('../utils/AppError');
const { assertEventScheduleDates } = require('../utils/dateValidation');

const MAX_IMAGE_DATA_LEN = 4_500_000;

const pickSchoolEventFields = (body) => {
  const {
    title,
    description,
    category,
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    location,
    totalTickets,
    capacity,
    image,
    thumbnail,
    bannerFileName,
    eventType,
    duration,
    format,
    speakers,
    agenda,
    learningOutcomes,
    expectedAttendees,
    ticketTypes,
    ticketPrice,
    timelineSource,
    eventPlanFile,
    eventPlanFileName,
    eventPlanFileMime,
    eventPlanLink,
  } = body;

  if (image && image.length > MAX_IMAGE_DATA_LEN) {
    const err = new Error('IMAGE_TOO_LARGE');
    err.code = 'IMAGE_TOO_LARGE';
    throw err;
  }

  const normalizedSpeakers = normalizeSpeakers(speakers);
  for (const sp of normalizedSpeakers) {
    if (sp.avatar && sp.avatar.length > MAX_IMAGE_DATA_LEN) {
      const err = new Error('SPEAKER_AVATAR_TOO_LARGE');
      err.code = 'SPEAKER_AVATAR_TOO_LARGE';
      throw err;
    }
  }

  const primarySpeaker = normalizedSpeakers[0];
  const resolvedTickets = Number(totalTickets) || Number(capacity) || 100;
  const bannerImage = image || thumbnail || '';

  const normalizedTimelineSource = (() => {
    const src = timelineSource;
    if (!src || !String(src.itemTitle || '').trim()) return null;
    return {
      timelineId: src.timelineId || null,
      itemTitle: String(src.itemTitle).trim(),
      semesterLabel: String(src.semesterLabel || '').trim(),
    };
  })();

  return {
    title: title?.trim(),
    description: description || '',
    category: normalizeEventCategory(category || 'Khác'),
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    location: location || '',
    totalTickets: resolvedTickets,
    capacity: resolvedTickets,
    ticketPrice: Number(ticketPrice) || 0,
    image: bannerImage,
    thumbnail: bannerImage,
    bannerFileName: bannerFileName || '',
    eventType: eventType || '',
    duration: duration || '',
    format: ['campus', 'online', 'hybrid'].includes(format) ? format : 'campus',
    speakers: normalizedSpeakers,
    speaker: primarySpeaker?.name || '',
    speakerRole: primarySpeaker?.role || '',
    speakerAvatar: primarySpeaker?.avatar || '',
    agenda: agenda || '',
    learningOutcomes: normalizeLearningOutcomes(learningOutcomes),
    expectedAttendees: Number(expectedAttendees) || 0,
    ticketTypes: normalizeTicketTypes(ticketTypes),
    ...(normalizedTimelineSource ? { timelineSource: normalizedTimelineSource } : {}),
    ...(eventPlanFile !== undefined ? { eventPlanFile: eventPlanFile || '' } : {}),
    ...(eventPlanFileName !== undefined ? { eventPlanFileName: eventPlanFileName || '' } : {}),
    ...(eventPlanFileMime !== undefined ? { eventPlanFileMime: eventPlanFileMime || '' } : {}),
    ...(eventPlanLink !== undefined ? { eventPlanLink: eventPlanLink || '' } : {}),
  };
};

const resolveSchoolUnitRole = (userRole) => {
  if (userRole === 'ctsv') return 'ctsv';
  if (userRole === 'icpdp') return 'icpdp';
  const err = new Error('Chỉ IC-PDP hoặc CTSV được quản lý timeline đơn vị!');
  err.statusCode = 403;
  throw err;
};

router.use(authMiddleware);
router.use(requireCtsvPortal);

const applyEventTimeFilter = (filter, time) => {
  if (!time || time === 'all' || time === 'Tất cả') return;
  if (time === 'Hôm nay') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    filter.startDate = { $gte: start, $lte: end };
  } else if (time === 'Tuần này') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    filter.startDate = { $gte: start, $lte: end };
  } else if (time === 'Tháng này') {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(-1);
    filter.startDate = { $gte: start, $lte: end };
  }
};

const buildEventFilter = (query) => {
  const filter = { isDeleted: { $ne: true } };
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  } else if (!query.status) {
    filter.status = { $nin: ['rejected', 'cancelled'] };
  }
  // status=all → không filter status, hiện tất cả
  if (query.category && query.category !== 'Tất cả') filter.category = query.category;

  const searchOr = buildEventTextSearchOr(query.q || query.search);
  if (searchOr) {
    filter.$or = searchOr;
  }
  applyEventTimeFilter(filter, query.time);
  return filter;
};

// GET /api/ctsv/stats
router.get('/stats', async (req, res) => {
  try {
    // Chạy song song 3 query thay vì tuần tự — giảm latency ~150-300ms
    const [pendingPartners, liveCount, agg] = await Promise.all([
      Partner.countDocuments({ status: { $in: ['pending', 'info_requested'] } }),
      Event.countDocuments({ status: 'live' }),
      Event.aggregate([{ $group: { _id: null, total: { $sum: '$registeredCount' } } }])
    ]);
    const participants = agg[0]?.total || 0;
    const participantsLabel =
      participants >= 1000 ? `${(participants / 1000).toFixed(1)}K` : String(participants);

    return res.json({
      success: true,
      stats: [
        { label: 'Đối tác chờ duyệt', value: String(pendingPartners), trend: 'Cần xử lý' },
        { label: 'Sự kiện đang diễn ra', value: String(liveCount), trend: 'Ổn định' },
        { label: 'Sinh viên tham gia', value: participantsLabel, trend: '+8%' }
      ],
      raw: { pendingPartners, liveCount, participants }
    });
  } catch (error) {
    console.error('ctsv stats:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/performance — tỷ lệ hiệu suất thực từ DB
router.get('/performance', async (req, res) => {
  try {
    const [
      totalProposals,
      approvedProposals,
      totalEndedEvents,
      submittedReports,
      allClubs,
      activeClubs,
    ] = await Promise.all([
      EventProposal.countDocuments({ status: { $nin: ['draft'] } }),
      EventProposal.countDocuments({ status: { $in: ['pending_admin', 'pending_ctsv', 'approved', 'live', 'ended'] } }),
      Event.countDocuments({ status: { $in: ['ended', 'live'] } }),
      SubmittedCtsvReport.countDocuments({}),
      EventProposal.distinct('clubId', { clubId: { $nin: ['', null] } }),
      EventProposal.distinct('clubId', { clubId: { $nin: ['', null] }, status: { $in: ['approved', 'live', 'ended', 'pending_admin', 'pending_ctsv'] } }),
    ]);

    const proposalRate = totalProposals > 0 ? Math.round((approvedProposals / totalProposals) * 100) : 0;
    const clubRate = allClubs.length > 0 ? Math.round((activeClubs.length / allClubs.length) * 100) : 0;
    const reportRate = totalEndedEvents > 0 ? Math.min(100, Math.round((submittedReports / totalEndedEvents) * 100)) : 0;

    return res.json({
      success: true,
      performance: [
        { name: 'Đề xuất được duyệt', rate: proposalRate },
        { name: 'CLB hoạt động tích cực', rate: clubRate },
        { name: 'Báo cáo đã nộp', rate: reportRate },
      ],
    });
  } catch (error) {
    console.error('ctsv performance:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/events
router.get('/events', async (req, res) => {
  try {
    if (req.query.forAnnouncement === '1' || req.query.forAnnouncement === 'true') {
      const events = await findLinkableAnnouncementEvents();
      return res.json({
        success: true,
        events: events.map(formatEvent)
      });
    }

    const filter = buildEventFilter(req.query);
    const forApproval = req.query.forApproval === '1' || req.query.forApproval === 'true';
    let queryBuilder = Event.find(filter).select(
      '-description -learningOutcomes -agenda -eventPlanFile'
    );

    if (req.query.sort === 'newest') {
      queryBuilder = queryBuilder.sort({ createdAt: -1 });
    } else if (req.query.sort === 'updated') {
      queryBuilder = queryBuilder.sort({ updatedAt: -1 });
    } else if (forApproval) {
      queryBuilder = queryBuilder.sort({ createdAt: -1 });
    } else {
      queryBuilder = queryBuilder.sort({ startDate: 1 });
    }

    if (req.query.limit) {
      const limitVal = parseInt(req.query.limit, 10);
      if (!isNaN(limitVal) && limitVal > 0) {
        queryBuilder = queryBuilder.limit(limitVal);
      } else {
        queryBuilder = queryBuilder.limit(100);
      }
    } else {
      queryBuilder = queryBuilder.limit(100);
    }

    const events = await queryBuilder.lean();
    const pendingPlanStatuses = ['pending', 'pending_ctsv', 'pending_icpdp', 'pending_admin', 'revision'];
    const enrichedEvents = forApproval ? await hydrateEventsPlanFromProposals(events) : events;

    return res.json({
      success: true,
      events: enrichedEvents.map((event) =>
        formatEvent(event, {
          includePlanFile: forApproval && pendingPlanStatuses.includes(event.status),
        })
      ),
    });
  } catch (error) {
    console.error('ctsv events list:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/events/calendar — toàn bộ sự kiện (mọi trạng thái, mọi nguồn)
router.get('/events/calendar', async (req, res) => {
  try {
    const events = await Event.find({})
      .select('-description -learningOutcomes -agenda -eventPlanFile')
      .sort({ startDate: 1 })
      .limit(500)
      .lean();
    return res.json({
      success: true,
      events: events.map(formatEvent)
    });
  } catch (error) {
    console.error('ctsv calendar:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/events/moderation/pending-icpdp — yêu cầu hoãn/hủy CLB chờ IC-PDP
router.get('/events/moderation/pending-icpdp', requireIcpdpOrCtsv, async (req, res) => {
  try {
    const { ICPDP_MODERATION_PENDING_STATUSES } = require('../constants/eventModeration');
    const events = await Event.find({
      source: 'club',
      status: { $in: ICPDP_MODERATION_PENDING_STATUSES }
    })
      .populate('proposalId', 'clubName')
      .sort({ moderationRequestedAt: -1, updatedAt: -1 })
      .lean();
    return res.json({
      success: true,
      events: events.map((ev) => ({
        ...formatEvent(ev),
        clubName: ev.proposalId?.clubName || '',
      }))
    });
  } catch (error) {
    console.error('icpdp moderation list:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/events/approved — sự kiện CTSV/Partner trên trang Quản lý sự kiện
// PHẢI đặt trước /events/:id để tránh Express match 'approved' vào :id
const CTSV_MANAGED_EVENT_STATUSES = [
  'pending_admin',
  'revision',
  'approved',
  'live',
  'ended',
  'hidden',
  'pending_edit',
  'pending_cancel',
  'pending_hide',
  'pending_postpone',
  'pending_delete',
  'rejected',
];

const buildCtsvManagedEventsFilter = ({ source, search, status, time }) => {
  const clauses = [
    { isDeleted: { $ne: true } },
    { status: { $in: CTSV_MANAGED_EVENT_STATUSES } },
  ];

  if (source === 'school') {
    clauses.push({ source: 'school', schoolOrganizerRole: { $ne: 'icpdp' } });
  } else if (source === 'icpdp') {
    clauses.push({ source: 'school', schoolOrganizerRole: 'icpdp' });
  } else if (source === 'partner') {
    clauses.push({ source: 'partner' });
  } else {
    clauses.push({ source: { $in: ['school', 'partner'] } });
  }

  if (status && status !== 'all') {
    clauses.push({ status });
  }

  const q = String(search || '').trim();
  if (q) {
    clauses.push({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
      ],
    });
  }

  const filter = { $and: clauses };
  applyEventTimeFilter(filter, time);
  return filter;
};

router.get('/events/approved', async (req, res) => {
  try {
    const { source, search, status, time, page = 1, limit = 20 } = req.query;

    const filter = buildCtsvManagedEventsFilter({ source, search, status, time });

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 20);
    const lim = Math.min(100, parseInt(limit) || 20);

    const [events, total] = await Promise.all([
      Event.find(filter)
        .select('-description -learningOutcomes -agenda -eventPlanFile')
        .sort({ updatedAt: -1, startDate: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Event.countDocuments(filter),
    ]);

    return res.json({ success: true, events: events.map(formatEvent), total, page: parseInt(page), limit: lim });
  } catch (err) {
    console.error('ctsv events/approved:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/events/icpdp-managed — Quản lý sự kiện IC-PDP (cấp trường IC-PDP + CLB)
const ICPDP_MANAGED_EVENT_STATUSES = [
  'pending',
  'pending_icpdp',
  'pending_ctsv',
  'pending_admin',
  'revision',
  'approved',
  'live',
  'ended',
  'hidden',
  'pending_edit',
  'pending_cancel',
  'pending_hide',
  'pending_postpone',
  'pending_delete',
  'pending_icpdp_cancel',
  'pending_icpdp_postpone',
  'pending_icpdp_delete',
  'pending_icpdp_edit',
  'rejected',
];

const buildIcpdpManagedEventsFilter = ({ source, search, status, time }) => {
  const clauses = [
    { isDeleted: { $ne: true } },
    { status: { $in: ICPDP_MANAGED_EVENT_STATUSES } },
  ];

  if (source === 'school' || source === 'icpdp') {
    clauses.push({ source: 'school', schoolOrganizerRole: 'icpdp' });
  } else if (source === 'club') {
    clauses.push({ source: 'club' });
  } else {
    clauses.push({
      $or: [
        { source: 'school', schoolOrganizerRole: 'icpdp' },
        { source: 'club' },
      ],
    });
  }

  if (status && status !== 'all') {
    clauses.push({ status });
  }

  const q = String(search || '').trim();
  if (q) {
    clauses.push({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
      ],
    });
  }

  const filter = { $and: clauses };
  applyEventTimeFilter(filter, time);
  return filter;
};

const mapIcpdpManagedEvent = (ev) => {
  const formatted = formatEvent(ev);
  const clubName = ev.proposalId?.clubName || ev.clubId?.name || '';
  return { ...formatted, clubName };
};

router.get('/events/icpdp-managed', requireIcpdpOrCtsv, async (req, res) => {
  try {
    const { source, search, status, time, page = 1, limit = 20 } = req.query;

    const filter = buildIcpdpManagedEventsFilter({ source, search, status, time });

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 20);
    const lim = Math.min(100, parseInt(limit) || 20);

    const [events, total] = await Promise.all([
      Event.find(filter)
        .select('-description -learningOutcomes -agenda -eventPlanFile')
        .populate('proposalId', 'clubName submittedByEmail')
        .populate('clubId', 'name')
        .sort({ updatedAt: -1, startDate: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Event.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      events: events.map(mapIcpdpManagedEvent),
      total,
      page: parseInt(page),
      limit: lim,
    });
  } catch (err) {
    console.error('ctsv events/icpdp-managed:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/events/:id/rating-stats — thống kê đánh giá (CTSV / IC-PDP / Admin)
router.get('/events/:id/rating-stats', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('_id').lean();
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    const stats = await reviewService.getEventRatingStats(req.params.id);
    return res.json({ success: true, stats });
  } catch (error) {
    console.error('ctsv event rating-stats:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Không tải được thống kê đánh giá.',
    });
  }
});

// GET /api/ctsv/events/:id
router.get('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    let students;
    if (canRoleManageSchoolEvent(event, req.userRole)) {
      const registrations = await EventRegistration.find({ event: event._id })
        .populate('user', 'fullname studentId email role')
        .sort({ registeredAt: -1 })
        .limit(200)
        .lean();

      students = registrations.map((registration) => ({
        _id: registration._id,
        status: registration.status === 'attended' ? 'checked-in' : registration.status,
        createdAt: registration.createdAt,
        cancelledAt: registration.cancelledAt || null,
        checkedInAt: registration.checkedInAt || null,
        checkedOutAt: registration.checkedOutAt || null,
        student: registration.user,
      }));
    }
    let formatted = formatEvent(event, { includePlanFile: true });
    if (canRoleManageSchoolEvent(event, req.userRole)) {
      const { attachInlineEventCover } = require('../utils/eventCoverStorage');
      formatted = await attachInlineEventCover(formatted, event);
    }
    return res.json({ success: true, event: formatted, students });
  } catch (error) {
    console.error('ctsv event detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// POST /api/ctsv/events — tạo sự kiện cấp trường (CTSV / IC-PDP / Admin)
router.post('/events', requireSchoolEventSubmit, async (req, res) => {
  try {
    const data = pickSchoolEventFields(req.body);

    if (!data.title || !data.registrationStartDate || !data.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề, thời gian đăng ký và thời gian sự kiện là bắt buộc!'
      });
    }

    assertEventScheduleDates({
      registrationStartDate: new Date(data.registrationStartDate),
      startDate: new Date(data.startDate),
    });

    const schoolOrganizerRole = resolveSchoolOrganizerRole(req.userRole);

    const unitRole = schoolOrganizerRole === 'icpdp' ? 'icpdp' : schoolOrganizerRole === 'ctsv' ? 'ctsv' : null;
    const timelineId = data.timelineSource?.timelineId || null;
    // Sự kiện phát sinh (không gắn timeline) — chỉ Admin duyệt, không cần timeline đã duyệt.
    if (unitRole && timelineId) {
      await clubSemesterTimelineService.assertApprovedTimelineForSchoolUnit(unitRole, timelineId);
    }

    const event = await Event.create({
      ...data,
      registrationStartDate: new Date(data.registrationStartDate),
      registrationEndDate: data.registrationEndDate ? new Date(data.registrationEndDate) : undefined,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      source: 'school',
      schoolOrganizerRole,
      createdByEmail: req.authEmail,
      ...buildSchoolEventSubmitMeta(req.authEmail)
    });

    createAndBroadcast({
      recipientRoles: ['admin'],
      title: 'Sự kiện cấp trường mới cần duyệt',
      body: `CTSV/IC-PDP vừa tạo sự kiện: ${event.title}`,
      type: 'info',
      refId: String(event._id),
      refType: 'school_event'
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      event: formatEvent(event),
      message: 'Đã gửi đơn tổ chức sự kiện. Chờ Admin phê duyệt.'
    });
  } catch (error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    if (error.code === 'IMAGE_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        message: 'Ảnh bìa quá lớn. Vui lòng cắt lại hoặc chọn ảnh nhỏ hơn.'
      });
    }
    if (error.code === 'SPEAKER_AVATAR_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        message: 'Ảnh đại diện diễn giả quá lớn. Vui lòng cắt lại hoặc chọn ảnh nhỏ hơn.'
      });
    }
    if (error.name === 'ValidationError') {
      const first = Object.values(error.errors || {})[0];
      return res.status(400).json({
        success: false,
        message: first?.message || 'Dữ liệu sự kiện không hợp lệ.'
      });
    }
    console.error('ctsv create event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PUT /api/ctsv/events/:id — cập nhật sự kiện cấp trường (đầy đủ trường form)
router.put('/events/:id', requireSchoolEventSubmit, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }

    const data = pickSchoolEventFields(req.body);
    if (!data.title || !data.registrationStartDate || !data.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề, thời gian đăng ký và thời gian sự kiện là bắt buộc!'
      });
    }

    assertEventScheduleDates({
      registrationStartDate: new Date(data.registrationStartDate),
      startDate: new Date(data.startDate),
    });

    if (event.source !== 'school') {
      return res.status(403).json({ success: false, message: 'Chỉ cập nhật sự kiện cấp trường!' });
    }

    if (!canRoleManageSchoolEvent(event, req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa sự kiện do đơn vị khác gửi.'
      });
    }

    if (!canCtsvEditSchoolEvent(event)) {
      return res.status(400).json({
        success: false,
        message: 'Cần Admin phê duyệt yêu cầu chỉnh sửa trước khi mở form.'
      });
    }

    Object.assign(event, {
      ...data,
      registrationStartDate: new Date(data.registrationStartDate),
      registrationEndDate: data.registrationEndDate
        ? new Date(data.registrationEndDate)
        : event.registrationEndDate,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : event.endDate
    });
    const shouldNotifyAdminResubmission = shouldResubmitSchoolEventForAdmin(event);
    if (shouldNotifyAdminResubmission) {
      Object.assign(event, buildSchoolEventSubmitMeta(req.authEmail));
      event.rejectionReason = '';
    }
    event.ctsvEditUnlocked = false;
    await event.save();

    if (shouldNotifyAdminResubmission) {
      createAndBroadcast({
        recipientRoles: ['admin'],
        title: 'CTSV đã gửi lại sự kiện chờ Admin duyệt',
        body: `Sự kiện "${event.title}" đã được CTSV cập nhật và gửi lại để Admin phê duyệt.`,
        type: 'event_submit',
        refId: String(event._id),
        refType: 'Event'
      }).catch(() => {});
    }

    return res.json({
      success: true,
      event: formatEvent(event),
      message: 'Đã cập nhật và gửi lại Admin phê duyệt.'
    });
  } catch (error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    if (error.code === 'IMAGE_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        message: 'Ảnh bìa quá lớn. Vui lòng cắt lại hoặc chọn ảnh nhỏ hơn.'
      });
    }
    console.error('ctsv update event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/ctsv/events/:id/approve
router.patch('/events/:id/approve', requireCtsvApprove, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    if (event.source === 'school') {
      return res.status(400).json({
        success: false,
        message: 'Sự kiện cấp trường cần Admin phê duyệt trước khi mở đăng ký.'
      });
    }
    const isClubEvent = event.source === 'club' || event.clubId;
    if (isClubEvent) {
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Sự kiện CLB chỉ Admin được phê duyệt cuối.',
        });
      }
      if (event.status === 'pending_icpdp') {
        return res.status(400).json({
          success: false,
          message: 'Sự kiện CLB cần IC-PDP duyệt trước, sau đó Admin phê duyệt.'
        });
      }
      if (event.status !== 'pending_admin') {
        return res.status(400).json({
          success: false,
          message: 'Sự kiện CLB chỉ được phê duyệt khi đang chờ Admin duyệt!'
        });
      }
      event.status = 'approved';
      event.approvedByEmail = req.authEmail;
      event.adminApprovedByEmail = req.authEmail;
      event.adminApprovedAt = new Date();
      event.ctsvNote = req.body.note || '';
      await event.save();
      if (event.proposalId) {
        await EventProposal.findByIdAndUpdate(event.proposalId, {
          status: 'approved',
          eventId: event._id,
          ctsvNote: req.body.note || '',
        });
      }
      return res.json({ success: true, event: formatEvent(event) });
    }
    if (!['pending_ctsv', 'pending_icpdp', 'revision'].includes(event.status)) {
      return res.status(400).json({ success: false, message: 'Sự kiện không ở trạng thái chờ duyệt!' });
    }
    event.status = 'approved';
    event.approvedByEmail = req.authEmail;
    event.ctsvNote = req.body.note || '';
    await event.save();
    return res.json({ success: true, event: formatEvent(event) });
  } catch (error) {
    console.error('ctsv approve event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/ctsv/events/:id/reject
router.patch('/events/:id/reject', requireProposalModerate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    if (req.userRole === 'icpdp' && event.status !== 'pending_icpdp') {
      return res.status(403).json({
        success: false,
        message: 'ICPDP chỉ từ chối được sự kiện đang chờ ICPDP duyệt!'
      });
    }
    if (req.userRole !== 'icpdp' && event.source === 'school') {
      return res.status(400).json({
        success: false,
        message: 'Sự kiện cấp trường cần Admin phê duyệt trên trang quản trị.'
      });
    }
    event.status = 'rejected';
    event.rejectionReason = req.body.reason || req.body.note || '';
    event.approvedByEmail = req.authEmail;
    await event.save();
    if (event.proposalId) {
      await EventProposal.findByIdAndUpdate(event.proposalId, {
        status: 'rejected',
        rejectionReason: event.rejectionReason,
        ...(req.userRole === 'icpdp' ? { icpdpNote: event.rejectionReason } : {}),
      });
    }
    return res.json({ success: true, event: formatEvent(event) });
  } catch (error) {
    console.error('ctsv reject event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/ctsv/events/:id/request-revision
router.patch('/events/:id/request-revision', requireCtsvApprove, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    event.status = 'revision';
    event.ctsvNote = req.body.note || '';
    await event.save();
    return res.json({ success: true, event: formatEvent(event) });
  } catch (error) {
    console.error('ctsv revision event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/ctsv/events/:id/publish — chuyển approved -> live
router.patch('/events/:id/publish', requireSchoolEventSubmit, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    if (event.source !== 'school') {
      return res.status(400).json({ success: false, message: 'Chỉ publish sự kiện cấp trường!' });
    }
    if (!canRoleManageSchoolEvent(event, req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền publish sự kiện do đơn vị khác gửi.'
      });
    }
    if (event.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ publish sự kiện đã được Admin phê duyệt!'
      });
    }
    event.status = 'live';
    await event.save();
    return res.json({ success: true, event: formatEvent(event) });
  } catch (error) {
    console.error('ctsv publish event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/ctsv/events/:id/moderation — hủy / hoãn / ẩn (hoãn thời tiết: không cần Admin)
router.patch('/events/:id/moderation', requireCtsvApprove, async (req, res) => {
  try {
    const { action, reason, isWeatherPostpone } = req.body || {};
    const result = await requestModeration(
      req.params.id,
      { action, reason, isWeatherPostpone: isWeatherPostpone === true },
      req.authEmail
    );
    return res.json({
      success: true,
      event: formatEvent(result.event),
      message: result.message
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('ctsv event moderation:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/ctsv/events/:id/moderation/icpdp-approve
router.patch('/events/:id/moderation/icpdp-approve', requireIcpdpOrCtsv, async (req, res) => {
  try {
    const result = await approveIcpdpModeration(req.params.id, req.body?.note, req.authEmail);
    createAndBroadcast({
      recipientRoles: ['admin'],
      title: 'Yêu cầu điều chỉnh sự kiện cần Admin duyệt',
      body: `IC-PDP đã duyệt sơ bộ yêu cầu cho sự kiện "${result.event?.title || ''}".`,
      type: 'event_change_submit',
      refId: String(req.params.id),
      refType: 'Event'
    }).catch(() => {});
    return res.json({
      success: true,
      event: formatEvent(result.event),
      message: result.message
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('icpdp moderation approve:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/ctsv/events/:id/moderation/icpdp-reject
router.patch('/events/:id/moderation/icpdp-reject', requireIcpdpOrCtsv, async (req, res) => {
  try {
    const result = await rejectIcpdpModeration(req.params.id, req.body?.reason, req.authEmail);
    createAndBroadcast({
      recipientEmails: [result.event?.moderationRequestedByEmail, result.event?.createdByEmail],
      title: 'Yêu cầu điều chỉnh sự kiện bị từ chối',
      body: req.body?.reason || 'IC-PDP chưa chấp nhận yêu cầu điều chỉnh sự kiện.',
      type: 'event_change_reject',
      refId: String(req.params.id),
      refType: 'Event'
    }).catch(() => {});
    return res.json({
      success: true,
      event: formatEvent(result.event),
      message: result.message
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('icpdp moderation reject:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});


// GET /api/ctsv/reports — báo cáo sau / đang diễn ra (live, ended, đã qua ngày, eventState expired)
router.get('/reports', async (req, res) => {
  try {
    const now = new Date();
    const excludedStatuses = [
      'draft',
      'rejected',
      'pending',
      'pending_ctsv',
      'pending_icpdp',
      'pending_admin',
      'revision'
    ];
    // Phạm vi báo cáo theo cổng:
    // - ICPDP: sự kiện của CLB và của IC-PDP (cấp trường do IC-PDP tổ chức).
    // - CTSV: sự kiện của CTSV (cấp trường không phải IC-PDP) và của đối tác.
    // - Admin: xem tất cả.
    let sourceScope = null;
    if (req.userRole === 'icpdp') {
      sourceScope = [
        { source: 'club' },
        { source: 'school', schoolOrganizerRole: 'icpdp' },
      ];
    } else if (req.userRole === 'ctsv') {
      sourceScope = [
        { source: 'partner' },
        { source: 'school', schoolOrganizerRole: { $ne: 'icpdp' } },
      ];
    }

    const query = {
      status: { $nin: excludedStatuses },
      $or: [
        { status: { $in: ['live', 'ended'] } },
        { eventState: 'expired' },
        { endDate: { $lte: now } },
        { endDate: null, startDate: { $lte: now } },
        { endDate: { $exists: false }, startDate: { $lte: now } }
      ]
    };
    if (sourceScope) {
      query.$and = [{ $or: sourceScope }];
    }

    const events = await Event.find(query)
      .sort({ startDate: -1 })
      .limit(100);

    const reportIds = events.map((e) => String(e._id));
    const submittedRows = await SubmittedCtsvReport.find({
      reportId: { $in: reportIds },
      submittedByRole: { $in: ['club_manager', 'partner'] },
    })
      .select('reportId submittedAt submittedByRole')
      .lean();
    const clubSubmittedMap = new Map();
    const partnerSubmittedMap = new Map();
    submittedRows.forEach((s) => {
      if (s.submittedByRole === 'club_manager') {
        clubSubmittedMap.set(String(s.reportId), s.submittedAt);
      } else if (s.submittedByRole === 'partner') {
        partnerSubmittedMap.set(String(s.reportId), s.submittedAt);
      }
    });

    const reports = events.map((e) => {
      const cap = e.capacity || e.totalTickets || 0;
      const registered = e.registeredCount || 0;
      const reportPhase = resolveReportPhase(e);
      const display = getReportDisplayStatus(reportPhase, e.status);
      const clubSubmittedAt = clubSubmittedMap.get(String(e._id)) || null;
      const partnerSubmittedAt = partnerSubmittedMap.get(String(e._id)) || null;

      return {
        ...formatEvent(e),
        status: display.label,
        statusKey: display.statusKey,
        registeredCount: registered,
        totalTickets: cap,
        attendanceRate: cap > 0 ? Math.round((registered / cap) * 100) : 0,
        reportPhase,
        clubSubmitted: Boolean(clubSubmittedAt),
        clubSubmittedAt,
        partnerSubmitted: Boolean(partnerSubmittedAt),
        partnerSubmittedAt
      };
    });

    return res.json({ success: true, reports });
  } catch (error) {
    console.error('ctsv reports:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/reports/:id — chi tiết báo cáo sau sự kiện (đã kết thúc)
router.get('/reports/:id', async (req, res) => {
  try {
    const result = await getCtsvReportDetail(req.params.id);
    const submission = await getSubmissionMeta(req.params.id);
    return res.json({ success: true, report: result.report, submission });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('ctsv report detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/reports/:id/submit-admin', async (req, res) => {
  try {
    const result = await submitCtsvReport(req.params.id, req.authEmail, req.userRole || 'ctsv');
    return res.json({
      success: true,
      submission: result.submission,
      sentToAdmin: result.sentToAdmin,
      sentToPartner: result.sentToPartner,
      emailSent: result.emailSent ?? null,
      message: result.message,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('ctsv report submit:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// --- Proposals ---

router.get('/proposals', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    else filter.status = { $in: ['pending_ctsv', 'pending_icpdp', 'pending_admin', 'revision'] };
    if (req.query.q) {
      const re = new RegExp(req.query.q.trim(), 'i');
      filter.$or = [{ title: re }, { clubName: re }];
    }
    const proposals = await EventProposal.find(filter).sort({ createdAt: -1 }).limit(100);
    const forApproval = req.query.forApproval === '1' || req.query.forApproval === 'true';
    const pendingPlanStatuses = ['pending_ctsv', 'pending_icpdp', 'pending_admin', 'revision'];
    const hydrated = await Promise.all(proposals.map((p) => hydrateProposalPlanFromLinkedEvent(p)));
    return res.json({
      success: true,
      proposals: hydrated.map((p) =>
        formatProposal(p, {
          includePlanFile: forApproval && pendingPlanStatuses.includes(p.status),
        })
      ),
    });
  } catch (error) {
    console.error('ctsv proposals:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/proposals/:id/cover', async (req, res) => {
  try {
    const EventProposal = require('../models/EventProposal');
    const { resolveProposalCoverResponse } = require('../utils/proposalCoverStorage');
    const { isImageDataUri } = require('../utils/dataUriStorage');
    const { parseDataUri, extensionFromMime, writeBufferToFile } = require('../utils/dataUriStorage');
    const path = require('path');
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).send('Not found');
    }
    const proposal = await EventProposal.findById(req.params.id).select('image coverFileExt').lean();
    if (!proposal) return res.status(404).send('Not found');
    if (isImageDataUri(proposal.image) && !proposal.coverFileExt) {
      const PROPOSAL_COVERS = path.join(__dirname, '../../uploads/proposal-covers');
      const { mime, buffer } = parseDataUri(proposal.image);
      const ext = extensionFromMime(mime, '', 'jpg');
      writeBufferToFile(path.join(PROPOSAL_COVERS, `${String(proposal._id)}.${ext}`), buffer)
        .then(() =>
          EventProposal.updateOne({ _id: proposal._id }, { $set: { coverFileExt: ext, image: '' } })
        )
        .catch(() => {});
    }
    const resolved = await resolveProposalCoverResponse(proposal);
    if (!resolved) return res.status(404).send('No cover');
    res.set('Content-Type', resolved.mime);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(resolved.buffer);
  } catch (error) {
    console.error('proposal cover:', error);
    return res.status(500).send('Server Error');
  }
});

router.get('/proposals/:id/plan', requireIcpdpOrCtsv, async (req, res) => {
  try {
    const { sendProposalPlan } = require('../utils/eventPlanStorage');
    await sendProposalPlan(req.params.id, res);
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/proposals/:id', async (req, res) => {
  try {
    const proposal = await EventProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất!' });
    }
    const proposalPayload = proposal.toObject();
    if (proposalPayload.linkedEventId) {
      const linked = await Event.findById(proposalPayload.linkedEventId)
        .select('eventPlanFile eventPlanFileName eventPlanFileMime eventPlanLink')
        .lean();
      if (linked) {
        if (!proposalPayload.eventPlanFile && linked.eventPlanFile) {
          proposalPayload.eventPlanFile = linked.eventPlanFile;
          proposalPayload.eventPlanFileName = linked.eventPlanFileName || proposalPayload.eventPlanFileName || '';
          proposalPayload.eventPlanFileMime = linked.eventPlanFileMime || proposalPayload.eventPlanFileMime || '';
        }
        if (!proposalPayload.eventPlanLink && linked.eventPlanLink) {
          proposalPayload.eventPlanLink = linked.eventPlanLink;
        }
      }
    }
    return res.json({ success: true, proposal: formatProposal(proposalPayload, { includePlanFile: true }) });
  } catch (error) {
    console.error('ctsv proposal detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/proposals/:id/icpdp-approve', requireIcpdpOrCtsv, async (req, res) => {
  try {
    const proposal = await EventProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất!' });
    }
    if (req.userRole === 'icpdp' && proposal.status !== 'pending_icpdp') {
      return res.status(400).json({ success: false, message: 'Đề xuất không chờ ICPDP duyệt!' });
    }
    const note = req.body.note || '';
    const isClubProposal = Boolean(proposal.clubId || proposal.linkedEventId);
    if (isClubProposal) {
      proposal.status = 'pending_admin';
      proposal.icpdpNote = note;
      await proposal.save();
      if (proposal.linkedEventId) {
        await Event.findByIdAndUpdate(proposal.linkedEventId, {
          status: 'pending_admin',
          icpdpNote: note,
        });
      }
      createAndBroadcast({
        recipientRoles: ['admin'],
        title: 'Đề xuất sự kiện CLB cần Admin duyệt',
        body: `IC-PDP đã duyệt đề xuất "${proposal.title}".`,
        type: 'event_submit',
        refId: String(proposal._id),
        refType: 'event_proposal'
      }).catch(() => {});
      return res.json({ success: true, proposal: formatProposal(proposal) });
    }
    proposal.status = 'pending_ctsv';
    proposal.icpdpNote = note;
    await proposal.save();
    createAndBroadcast({
      recipientRoles: ['ctsv'],
      title: 'Đề xuất sự kiện cần CTSV duyệt',
      body: `IC-PDP đã chuyển đề xuất "${proposal.title}" tới CTSV.`,
      type: 'event_submit',
      refId: String(proposal._id),
      refType: 'event_proposal'
    }).catch(() => {});
    return res.json({ success: true, proposal: formatProposal(proposal) });
  } catch (error) {
    console.error('icpdp approve proposal:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/proposals/:id/approve', requireCtsvApprove, async (req, res) => {
  try {
    const proposal = await EventProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất!' });
    }

    const isClubProposal = Boolean(proposal.clubId || proposal.linkedEventId);
    if (isClubProposal && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Đề xuất CLB chỉ Admin được phê duyệt cuối.',
      });
    }

    if (proposal.linkedEventId) {
      if (proposal.status !== 'pending_admin') {
        return res.status(400).json({
          success: false,
          message: 'Đề xuất CLB chỉ được Admin phê duyệt sau khi IC-PDP đã duyệt!'
        });
      }
      const event = await Event.findById(proposal.linkedEventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện liên kết!' });
      }
      event.status = 'approved';
      event.approvedByEmail = req.authEmail;
      event.adminApprovedByEmail = req.authEmail;
      event.adminApprovedAt = new Date();
      event.ctsvNote = req.body.note || '';
      await event.save();
      proposal.status = 'approved';
      proposal.eventId = event._id;
      proposal.ctsvNote = req.body.note || '';
      await proposal.save();
      createAndBroadcast({
        recipientRoles: ['ctsv', 'icpdp'],
        recipientEmails: [proposal.submittedByEmail],
        title: 'Đề xuất sự kiện đã được duyệt',
        body: `Admin đã phê duyệt sự kiện "${proposal.title}".`,
        type: 'event_approve',
        refId: String(event._id),
        refType: 'Event'
      }).catch(() => {});
      return res.json({
        success: true,
        proposal: formatProposal(proposal),
        event: formatEvent(event)
      });
    }

    if (!proposal.linkedEventId) {
      const isClubProposal = Boolean(proposal.clubId);
      if (isClubProposal) {
        if (proposal.status !== 'pending_admin') {
          return res.status(400).json({
            success: false,
            message: 'Đề xuất CLB chỉ được Admin phê duyệt khi đang chờ Admin duyệt!',
          });
        }
      } else if (!['pending_ctsv', 'pending_icpdp'].includes(proposal.status)) {
        return res.status(400).json({ success: false, message: 'Đề xuất không thể phê duyệt!' });
      }

      const ticketTypes = normalizeTicketTypes(proposal.ticketTypes);
    const ticketPrice =
      proposal.ticketPrice > 0
        ? proposal.ticketPrice
        : deriveTicketPriceFromTypes(ticketTypes);
    const totalTickets =
      proposal.totalTickets > 0
        ? proposal.totalTickets
        : totalQtyFromTypes(ticketTypes) || 100;

    const event = await Event.create({
      title: proposal.title,
      description: proposal.description,
      learningOutcomes: Array.isArray(proposal.learningOutcomes) ? proposal.learningOutcomes : [],
      category: normalizeEventCategory(proposal.category),
      startDate: proposal.startDate,
      endDate: proposal.endDate,
      location: proposal.location,
      totalTickets,
      capacity: totalTickets,
      ticketPrice,
      ticketTypes,
      expectedAttendees: proposal.expectedAttendees || 0,
      image: proposal.image,
      thumbnail: proposal.image,
      status: 'approved',
      source: isClubProposal ? 'club' : undefined,
      createdByEmail: proposal.submittedByEmail,
      approvedByEmail: req.authEmail,
      adminApprovedByEmail: isClubProposal ? req.authEmail : undefined,
      adminApprovedAt: isClubProposal ? new Date() : undefined,
      proposalId: proposal._id
    });

    proposal.status = 'approved';
    proposal.eventId = event._id;
    proposal.ctsvNote = req.body.note || '';
    await proposal.save();
    createAndBroadcast({
      recipientRoles: req.userRole === 'admin' ? ['ctsv', 'icpdp'] : ['icpdp'],
      recipientEmails: [proposal.submittedByEmail],
      title: 'Đề xuất sự kiện đã được duyệt',
      body: `${req.userRole === 'admin' ? 'Admin' : 'CTSV'} đã phê duyệt sự kiện "${proposal.title}".`,
      type: 'event_approve',
      refId: String(event._id),
      refType: 'Event'
    }).catch(() => {});

    return res.json({
      success: true,
      proposal: formatProposal(proposal),
      event: formatEvent(event)
    });
    }
  } catch (error) {
    console.error('ctsv approve proposal:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/proposals/:id/reject', requireProposalModerate, async (req, res) => {
  try {
    const proposal = await EventProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất!' });
    }
    const reason = req.body.reason || req.body.note || '';
    if (!String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối!' });
    }
    if (req.userRole === 'icpdp') {
      if (proposal.status !== 'pending_icpdp') {
        return res.status(403).json({
          success: false,
          message: 'ICPDP chỉ từ chối được đề xuất đang chờ ICPDP duyệt!'
        });
      }
      proposal.icpdpNote = reason;
    } else if (!['pending_ctsv', 'pending_icpdp', 'revision'].includes(proposal.status)) {
      return res.status(400).json({
        success: false,
        message: 'Đề xuất không ở trạng thái có thể từ chối!'
      });
    }
    proposal.status = 'rejected';
    proposal.rejectionReason = reason;
    await proposal.save();
    // Đồng bộ sự kiện liên kết để CLB thấy bị từ chối và gửi lại được.
    if (proposal.linkedEventId) {
      await Event.findByIdAndUpdate(proposal.linkedEventId, {
        status: 'rejected',
        rejectionReason: reason,
      });
    }
    createAndBroadcast({
      recipientRoles: req.userRole === 'admin' ? ['ctsv', 'icpdp'] : [],
      recipientEmails: [proposal.submittedByEmail],
      title: 'Đề xuất sự kiện bị từ chối',
      body: `Đề xuất "${proposal.title}" bị từ chối. Lý do: ${reason}`,
      type: 'event_reject',
      refId: String(proposal._id),
      refType: 'event_proposal'
    }).catch(() => {});
    return res.json({ success: true, proposal: formatProposal(proposal) });
  } catch (error) {
    console.error('ctsv reject proposal:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/proposals/:id/icpdp-request-revision', requireIcpdp, async (req, res) => {
  try {
    const proposal = await EventProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất!' });
    }
    if (proposal.status !== 'pending_icpdp') {
      return res.status(400).json({
        success: false,
        message: 'IC-PDP chỉ yêu cầu chỉnh sửa được đề xuất đang chờ IC-PDP duyệt!',
      });
    }
    const note = req.body.note || '';
    if (!String(note).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập ghi chú yêu cầu chỉnh sửa!' });
    }
    proposal.status = 'revision';
    proposal.icpdpNote = note;
    await proposal.save();
    if (proposal.linkedEventId) {
      await Event.findByIdAndUpdate(proposal.linkedEventId, {
        status: 'revision',
        icpdpNote: note,
      });
    }
    createAndBroadcast({
      recipientEmails: [proposal.submittedByEmail],
      title: 'Đề xuất sự kiện cần chỉnh sửa',
      body: note || `Đề xuất "${proposal.title}" cần được bổ sung.`,
      type: 'event_revision',
      refId: String(proposal._id),
      refType: 'event_proposal',
    }).catch(() => {});
    return res.json({ success: true, proposal: formatProposal(proposal) });
  } catch (error) {
    console.error('icpdp revision proposal:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/proposals/:id/request-revision', requireProposalModerate, async (req, res) => {
  try {
    const proposal = await EventProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất!' });
    }
    const note = req.body.note || '';
    if (!String(note).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập ghi chú yêu cầu chỉnh sửa!' });
    }
    if (req.userRole === 'icpdp') {
      if (proposal.status !== 'pending_icpdp') {
        return res.status(403).json({
          success: false,
          message: 'ICPDP chỉ yêu cầu chỉnh sửa được đề xuất đang chờ ICPDP duyệt!'
        });
      }
      proposal.icpdpNote = note;
    } else {
      proposal.ctsvNote = note;
    }
    proposal.status = 'revision';
    await proposal.save();
    if (proposal.linkedEventId) {
      const eventUpdate = { status: 'revision' };
      if (req.userRole === 'icpdp') {
        eventUpdate.icpdpNote = note;
      } else {
        eventUpdate.ctsvNote = note;
      }
      await Event.findByIdAndUpdate(proposal.linkedEventId, eventUpdate);
    }
    const revisionNote = req.userRole === 'icpdp' ? proposal.icpdpNote : proposal.ctsvNote;
    createAndBroadcast({
      recipientEmails: [proposal.submittedByEmail],
      title: 'Đề xuất sự kiện cần chỉnh sửa',
      body: revisionNote || `Đề xuất "${proposal.title}" cần được bổ sung.`,
      type: 'event_revision',
      refId: String(proposal._id),
      refType: 'event_proposal'
    }).catch(() => {});
    return res.json({ success: true, proposal: formatProposal(proposal) });
  } catch (error) {
    console.error('ctsv revision proposal:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// --- Partners ---

router.get('/partners', async (req, res) => {
  try {
    const filter = { status: { $in: PARTNER_STATUSES } };
    if (req.query.status) filter.status = req.query.status;
    const search = String(req.query.search || '').trim();
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: re },
        { email: re },
        { partnerCode: re },
        { proposedEventTitle: re },
        { category: re }
      ];
    }
    const partners = await Partner.find(filter).sort({ updatedAt: -1, createdAt: -1 }).limit(200).lean();
    const dedupedByEmail = new Map();
    for (const partner of partners) {
      const emailKey = String(partner.email || '').trim().toLowerCase() || String(partner._id);
      const existing = dedupedByEmail.get(emailKey);
      if (!existing) {
        dedupedByEmail.set(emailKey, partner);
        continue;
      }
      const existingTs = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const partnerTs = new Date(partner.updatedAt || partner.createdAt || 0).getTime();
      if (partnerTs >= existingTs) {
        dedupedByEmail.set(emailKey, partner);
      }
    }
    const uniquePartners = Array.from(dedupedByEmail.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
    const ids = uniquePartners.map((p) => p._id);
    const contracts = ids.length
      ? await Contract.find({ partnerId: { $in: ids } }).sort({ createdAt: -1 }).lean()
      : [];
    const contractByPartner = {};
    for (const c of contracts) {
      const key = String(c.partnerId);
      if (!contractByPartner[key]) contractByPartner[key] = c;
    }
    const enriched = uniquePartners.map((p) => {
      const contract = contractByPartner[String(p._id)];
      return {
        ...p,
        proposedProgram: p.proposedEventTitle || contract?.title || '',
        contractStatus: contract?.status || '',
        contractAmount: contract?.amount ?? null
      };
    });
    return res.json({ success: true, partners: enriched });
  } catch (error) {
    console.error('ctsv partners:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/partners/:id', async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
    const { resolvePartnerAvatarForAdmin } = require('../utils/partnerAvatar');
    const { ensurePrimaryPartnerMember, listPartnerMembers } = require('../services/partnerMember.service');
    await ensurePrimaryPartnerMember(partner);
    const partnerPayload = await resolvePartnerAvatarForAdmin(partner);
    const members = await listPartnerMembers(partner._id);
    const contracts = await Contract.find({ partnerId: partner._id });
    const PartnerEventRequest = require('../models/PartnerEventRequest');
    const eventRequest = await PartnerEventRequest.findOne({
      partnerId: partner._id,
      status: { $nin: ['draft', 'cancelled', 'deleted'] }
    }).sort({ updatedAt: -1 }).lean();
    const { sanitizePartnerRequestForApi } = require('../utils/partnerMediaStorage');
    const eventRequestPayload = eventRequest
      ? { ...eventRequest, ...sanitizePartnerRequestForApi(eventRequest) }
      : null;
    return res.json({
      success: true,
      partner: partnerPayload,
      members,
      contracts,
      eventRequest: eventRequestPayload
    });
  } catch (error) {
    console.error('ctsv partner detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/partners', requireCtsvApprove, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      representative,
      address,
      description,
      partnerCode,
      category,
      proposedEventTitle,
      expectedSponsorAmount,
      representativeTitle
    } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Tên đối tác là bắt buộc!' });
    }
    const partner = await Partner.create({
      name: name.trim(),
      email,
      phone,
      representative,
      address,
      description,
      partnerCode: partnerCode?.trim() || '',
      category: category?.trim() || '',
      proposedEventTitle: proposedEventTitle?.trim() || '',
      expectedSponsorAmount: Number(expectedSponsorAmount) || 0,
      representativeTitle: representativeTitle?.trim() || '',
      status: 'pending'
    });
    if (proposedEventTitle?.trim() || expectedSponsorAmount) {
      await Contract.create({
        partnerId: partner._id,
        title: proposedEventTitle?.trim() || `Đề xuất tài trợ — ${name.trim()}`,
        amount: Number(expectedSponsorAmount) || 0,
        status: 'pending'
      });
    }
    const { ensurePrimaryPartnerMember } = require('../services/partnerMember.service');
    await ensurePrimaryPartnerMember(partner);
    return res.status(201).json({ success: true, partner });
  } catch (error) {
    console.error('ctsv create partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

const CTSV_PARTNER_ACTION_STATUSES = ['pending', 'info_requested'];

router.patch('/partners/:id/approve', requireCtsvApprove, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
    if (!CTSV_PARTNER_ACTION_STATUSES.includes(partner.status)) {
      return res.status(400).json({
        success: false,
        message: 'Đơn này không ở trạng thái chờ CTSV phê duyệt.'
      });
    }
    partner.status = 'pending_admin';
    partner.ctsvApprovedByEmail = req.authEmail;
    partner.ctsvApprovedAt = new Date();
    partner.rejectionReason = '';
    await partner.save();

    const PartnerEventRequest = require('../models/PartnerEventRequest');
    await PartnerEventRequest.updateMany(
      { partnerId: partner._id, status: { $in: ['pending', 'info_requested'] } },
      { $set: { status: 'approved' } }
    );
    createAndBroadcast({
      recipientRoles: ['admin'],
      title: 'Đối tác mới cần phê duyệt',
      body: `CTSV đã duyệt sơ bộ đối tác: ${partner.name}. Chờ Admin phê duyệt lần cuối.`,
      type: 'info',
      refId: String(partner._id),
      refType: 'partner'
    }).catch(() => {});
    createAndBroadcast({
      recipientEmails: [partner.email],
      title: 'Hồ sơ đã qua vòng duyệt CTSV',
      body: `Hồ sơ của ${partner.name} đã được chuyển tới Admin phê duyệt cuối.`,
      type: 'partner_submit',
      refId: String(partner._id),
      refType: 'partner'
    }).catch(() => {});

    return res.json({
      success: true,
      partner,
      message: 'Đã phê duyệt cấp CTSV. Đơn chuyển Admin phê duyệt lần cuối.'
    });
  } catch (error) {
    console.error('ctsv approve partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/partners/:id/reject', requireCtsvApprove, async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối!' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
    if (!CTSV_PARTNER_ACTION_STATUSES.includes(partner.status)) {
      return res.status(400).json({
        success: false,
        message: 'Đơn này không thể từ chối ở trạng thái hiện tại.'
      });
    }
    partner.status = 'rejected';
    partner.rejectionReason = reason;
    partner.supplementReason = '';
    await partner.save();

    const PartnerEventRequest = require('../models/PartnerEventRequest');
    const pendingRequest = await PartnerEventRequest.findOneAndUpdate(
      { partnerId: partner._id, status: { $in: ['pending', 'info_requested'] } },
      { $set: { status: 'rejected', rejectionReason: reason } },
      { sort: { updatedAt: -1 } }
    );

    const isEventRequestRejection = Boolean(pendingRequest);
    createAndBroadcast({
      recipientEmails: [partner.email],
      title: isEventRequestRejection ? 'Yêu cầu tổ chức sự kiện bị từ chối' : 'Đề xuất hợp tác bị từ chối',
      body: isEventRequestRejection
        ? `CTSV đã từ chối yêu cầu tổ chức sự kiện "${pendingRequest.title || partner.proposedEventTitle || ''}". Lý do: ${reason}`
        : `CTSV đã từ chối đề xuất của ${partner.name}. Lý do: ${reason}`,
      type: 'partner_reject',
      refId: isEventRequestRejection ? String(pendingRequest._id) : String(partner._id),
      refType: isEventRequestRejection ? 'partner_event_request' : 'partner'
    }).catch(() => {});
    return res.json({ success: true, partner });
  } catch (error) {
    console.error('ctsv reject partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/partners/:id/request-info', requireCtsvApprove, async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung cần bổ sung!' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
    if (!CTSV_PARTNER_ACTION_STATUSES.includes(partner.status)) {
      return res.status(400).json({
        success: false,
        message: 'Đơn này không thể yêu cầu bổ sung ở trạng thái hiện tại.'
      });
    }
    partner.status = 'info_requested';
    partner.supplementReason = reason;
    partner.rejectionReason = '';
    await partner.save();

    const PartnerEventRequest = require('../models/PartnerEventRequest');
    await PartnerEventRequest.updateMany(
      { partnerId: partner._id, status: { $in: ['pending', 'approved'] } },
      { $set: { status: 'info_requested', supplementReason: reason } }
    );
    createAndBroadcast({
      recipientEmails: [partner.email],
      title: 'Hồ sơ đối tác cần bổ sung',
      body: reason,
      type: 'partner_revision',
      refId: String(partner._id),
      refType: 'partner'
    }).catch(() => {});
    return res.json({ success: true, partner });
  } catch (error) {
    console.error('ctsv partner request-info:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/contracts/:id/approve', requireCtsvApprove, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng!' });
    }
    contract.status = 'approved';
    contract.approvedByEmail = req.authEmail;
    await contract.save();
    return res.json({ success: true, contract });
  } catch (error) {
    console.error('ctsv approve contract:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// --- Announcements ---

router.get('/announcements', async (req, res) => {
  try {
    const list = await Announcement.find()
      .sort({ publishedAt: -1 })
      .limit(200)
      .populate('eventId', 'title source category')
      .lean();
    const announcements = list.map((doc) => ({
      ...doc,
      id: doc._id?.toString?.() || String(doc._id)
    }));
    return res.json({ success: true, announcements });
  } catch (error) {
    console.error('ctsv announcements:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/announcements', requireCtsvApprove, async (req, res) => {
  try {
    const { title, content, eventId, image, imageFileName } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề thông báo là bắt buộc!' });
    }
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung thông báo là bắt buộc!' });
    }
    if (image && image.length > MAX_IMAGE_DATA_LEN) {
      return res.status(400).json({
        success: false,
        message: 'Ảnh minh họa quá lớn. Vui lòng cắt lại hoặc chọn ảnh nhỏ hơn.'
      });
    }
    if (eventId) {
      const linkable = await isEventLinkableForAnnouncement(eventId);
      if (!linkable) {
        return res.status(400).json({
          success: false,
          message:
            'Chỉ được gắn sự kiện cấp trường (CTSV) hoặc sự kiện đối tác đã được CTSV và Admin phê duyệt.'
        });
      }
    }
    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      eventId: eventId || null,
      image: image || '',
      imageFileName: imageFileName?.trim() || '',
      publishedByEmail: req.authEmail,
      publishedAt: new Date(),
      isPublished: true,
      isHidden: false
    });
    return res.status(201).json({ success: true, announcement });
  } catch (error) {
    console.error('ctsv publish announcement:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/announcements/:id/hide', requireCtsvApprove, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo!' });
    }
    announcement.isHidden = true;
    await announcement.save();
    return res.json({ success: true, announcement });
  } catch (error) {
    console.error('ctsv hide announcement:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

const deleteAnnouncementHandler = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo!' });
    }
    return res.json({ success: true, message: 'Đã xóa thông báo.' });
  } catch (error) {
    console.error('ctsv delete announcement:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
};

router.delete('/announcements/:id', requireCtsvApprove, deleteAnnouncementHandler);
router.post('/announcements/:id/delete', requireCtsvApprove, deleteAnnouncementHandler);

// --- Semester timelines (CLB kế hoạch kỳ học — chỉ IC-PDP duyệt) ---
router.get('/semester-timelines', requireIcpdpTimeline, async (req, res) => {
  try {
    const ownerType = req.query.ownerType || (req.userRole === 'admin' ? 'all' : 'club');
    const defaultStatuses =
      req.userRole === 'admin'
        ? ['pending_admin']
        : ['pending_icpdp', 'revision'];
    const timelines = await clubSemesterTimelineService.listForReview({
      status: req.query.status,
      q: req.query.q,
      defaultStatuses: req.query.status ? null : defaultStatuses,
      ownerType,
    });
    return res.json({ success: true, timelines });
  } catch (error) {
    console.error('semester-timelines list:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/semester-timelines/:id/event-plan', requireIcpdpTimeline, async (req, res) => {
  try {
    const plan = await clubSemesterTimelineService.getEventPlanById(req.params.id);
    return res.json({ success: true, plan });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/semester-timelines/:id/plan', requireIcpdpTimeline, async (req, res) => {
  try {
    await clubSemesterTimelineService.sendTimelinePlanFile(req.params.id, res);
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/semester-timelines/:id', requireIcpdpTimeline, async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.getById(req.params.id);
    return res.json({ success: true, timeline });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/semester-timelines/:id/icpdp-approve', requireIcpdpTimeline, async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.icpdpApprove(req.params.id, {
      note: req.body.note,
      reviewerEmail: req.authEmail,
    });
    createAndBroadcast({
      recipientRoles: ['admin', 'club_manager'],
      recipientEmails: [timeline.submittedByEmail].filter(Boolean),
      title: 'Timeline đã qua IC-PDP',
      body: `Timeline ${timeline.semesterLabel || ''} đang chờ Admin phê duyệt.`,
      type: 'timeline_update',
      refId: String(req.params.id),
      refType: 'semester_timeline'
    }).catch(() => {});
    createAndBroadcast({
      recipientRoles: ['admin'],
      title: 'Timeline CLB cần Admin duyệt',
      body: `${timeline.clubName || 'CLB'} đã được IC-PDP duyệt sơ bộ.`,
      type: 'timeline_submit',
      refId: String(req.params.id),
      refType: 'semester_timeline'
    }).catch(() => {});
    return res.json({
      success: true,
      timeline,
      message: 'Đã chuyển timeline lên Admin phê duyệt.',
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/semester-timelines/:id/admin-approve', requireAdmin, async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.adminApprove(req.params.id, {
      note: req.body.note,
      reviewerEmail: req.authEmail,
    });
    createAndBroadcast({
      recipientRoles: ['icpdp', 'club_manager'],
      recipientEmails: [timeline.submittedByEmail].filter(Boolean),
      title: 'Timeline CLB đã được duyệt',
      body: `Admin đã phê duyệt timeline ${timeline.semesterLabel || ''}.`,
      type: 'timeline_approve',
      refId: String(req.params.id),
      refType: 'semester_timeline'
    }).catch(() => {});
    return res.json({
      success: true,
      timeline,
      message: 'Đã phê duyệt timeline kỳ học.',
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/semester-timelines/:id/reject', requireIcpdpTimeline, async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.rejectTimeline(req.params.id, {
      reason: req.body.reason,
      reviewerEmail: req.authEmail,
      reviewerRole: req.userRole,
    });
    createAndBroadcast({
      recipientRoles: ['club_manager', ...(req.userRole === 'admin' ? ['icpdp'] : [])],
      recipientEmails: [timeline.submittedByEmail].filter(Boolean),
      title: 'Timeline CLB bị từ chối',
      body: timeline.rejectionReason || 'Timeline chưa được chấp nhận.',
      type: 'timeline_reject',
      refId: String(req.params.id),
      refType: 'semester_timeline'
    }).catch(() => {});
    return res.json({ success: true, timeline });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/semester-timelines/:id/request-revision', requireIcpdpTimeline, async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.requestRevision(req.params.id, {
      note: req.body.note,
      reviewerEmail: req.authEmail,
    });
    createAndBroadcast({
      recipientRoles: ['club_manager'],
      recipientEmails: [timeline.submittedByEmail].filter(Boolean),
      title: 'Timeline CLB cần chỉnh sửa',
      body: timeline.icpdpNote || 'Timeline cần được bổ sung trước khi xét duyệt.',
      type: 'timeline_revision',
      refId: String(req.params.id),
      refType: 'semester_timeline'
    }).catch(() => {});
    return res.json({ success: true, timeline });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/semester-timelines/:id/change-request/icpdp-approve', requireIcpdpTimeline, async (req, res) => {
  try {
    const timeline = await clubSemesterTimelineService.icpdpApproveChangeRequest(req.params.id, {
      note: req.body.note,
      reviewerEmail: req.authEmail,
    });
    createAndBroadcast({
      recipientRoles: ['admin', 'club_manager'],
      title: 'Yêu cầu đổi timeline cần Admin duyệt',
      body: `${timeline.clubName || 'CLB'} có yêu cầu thay đổi timeline đã qua IC-PDP.`,
      type: 'timeline_change',
      refId: String(req.params.id),
      refType: 'semester_timeline'
    }).catch(() => {});
    return res.json({ success: true, timeline, message: 'Đã chuyển yêu cầu lên Admin duyệt.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/semester-timelines/:id/change-request/admin-approve', requireAdmin, async (req, res) => {
  try {
    const result = await clubSemesterTimelineService.adminApproveChangeRequest(req.params.id, {
      note: req.body.note,
      reviewerEmail: req.authEmail,
    });
    createAndBroadcast({
      recipientRoles: ['icpdp', 'club_manager'],
      recipientEmails: [result?.submittedByEmail].filter(Boolean),
      title: 'Yêu cầu thay đổi timeline đã được duyệt',
      body: result?.changeRequest?.statusKey === 'scheduled_delete'
        ? 'Admin đã duyệt xóa timeline — sẽ xóa sau 1 giờ. CLB có thể hủy yêu cầu trong thời gian này.'
        : 'Admin đã chấp nhận yêu cầu thay đổi timeline.',
      type: 'timeline_approve',
      refId: String(req.params.id),
      refType: 'semester_timeline'
    }).catch(() => {});
    if (result?.changeRequest?.statusKey === 'scheduled_delete' || result?.changeRequest?.status === 'scheduled_delete') {
      return res.json({
        success: true,
        timeline: result,
        message: 'Admin đã duyệt xóa — timeline sẽ bị xóa sau 1 giờ. CLB có thể hủy yêu cầu trong thời gian này.',
      });
    }
    if (result?.deleted) {
      return res.json({ success: true, ...result, message: 'Admin đã duyệt — timeline đã xóa.' });
    }
    return res.json({ success: true, timeline: result, message: 'Admin đã duyệt yêu cầu.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/semester-timelines/:id/change-request/reject', requireIcpdpTimeline, async (req, res) => {
  try {
    const stage = req.body.stage === 'admin' ? 'admin' : 'icpdp';
    const timeline = await clubSemesterTimelineService.rejectChangeRequest(req.params.id, {
      reason: req.body.reason,
      reviewerEmail: req.authEmail,
      stage,
    });
    createAndBroadcast({
      recipientRoles: ['club_manager', ...(stage === 'admin' ? ['icpdp'] : [])],
      recipientEmails: [timeline.submittedByEmail].filter(Boolean),
      title: 'Yêu cầu thay đổi timeline bị từ chối',
      body: req.body.reason || 'Yêu cầu thay đổi timeline chưa được chấp nhận.',
      type: 'timeline_reject',
      refId: String(req.params.id),
      refType: 'semester_timeline'
    }).catch(() => {});
    return res.json({ success: true, timeline, message: 'Đã từ chối yêu cầu.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

// --- School-unit semester timelines (ICPDP / CTSV own timelines) ---
router.get('/school-semester-timelines', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const timelines = await clubSemesterTimelineService.listForSchoolUnit(role);
    return res.json({ success: true, timelines });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/school-semester-timelines/:id/event-plan', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const plan = await clubSemesterTimelineService.getEventPlanByIdForSchoolUnit(req.params.id, role);
    return res.json({ success: true, plan });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/school-semester-timelines/:id/plan', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    await clubSemesterTimelineService.sendTimelinePlanFile(req.params.id, res, { role });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/school-semester-timelines/:id', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const timeline = await clubSemesterTimelineService.getByIdForSchoolUnit(req.params.id, role);
    return res.json({ success: true, timeline });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/school-semester-timelines', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const timeline = await clubSemesterTimelineService.createForSchoolUnit(role, req.body, req.authEmail);
    return res.status(201).json({ success: true, timeline, message: 'Đã tạo timeline kỳ học.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.put('/school-semester-timelines/:id', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const timeline = await clubSemesterTimelineService.updateForSchoolUnit(req.params.id, role, req.body);
    return res.json({ success: true, timeline, message: 'Đã cập nhật timeline.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/school-semester-timelines/:id/submit', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const timeline = await clubSemesterTimelineService.submitForSchoolUnit(req.params.id, role, req.authEmail);
    createAndBroadcast({
      recipientRoles: ['admin'],
      title: `Timeline ${timeline.ownerLabel || 'đơn vị'} cần Admin duyệt`,
      body: `${timeline.ownerLabel || 'Đơn vị'} vừa gửi timeline ${timeline.semesterLabel || ''}.`,
      type: 'timeline_submit',
      refId: String(req.params.id),
      refType: 'semester_timeline',
    }).catch(() => {});
    return res.json({ success: true, timeline, message: 'Đã gửi timeline lên Admin phê duyệt.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/school-semester-timelines/:id/withdraw', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const timeline = await clubSemesterTimelineService.withdrawForSchoolUnit(req.params.id, role);
    return res.json({ success: true, timeline, message: 'Đã thu hồi đơn timeline.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.delete('/school-semester-timelines/:id', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const result = await clubSemesterTimelineService.deleteForSchoolUnit(req.params.id, role);
    return res.json({ success: true, ...result, message: 'Đã xóa timeline.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/school-semester-timelines/:id/change-request', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const timeline = await clubSemesterTimelineService.requestChangeForSchoolUnit(req.params.id, req.body, role);
    createAndBroadcast({
      recipientRoles: ['admin'],
      title: 'Yêu cầu thay đổi timeline đơn vị',
      body: `${timeline.ownerLabel || 'Đơn vị'} gửi yêu cầu ${req.body.type || ''} timeline.`,
      type: 'timeline_update',
      refId: String(req.params.id),
      refType: 'semester_timeline',
    }).catch(() => {});
    return res.json({ success: true, timeline, message: 'Đã gửi yêu cầu thay đổi.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/school-semester-timelines/:id/cancel-scheduled-delete', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const timeline = await clubSemesterTimelineService.cancelScheduledDeleteForSchoolUnit(req.params.id, role);
    return res.json({ success: true, timeline, message: 'Đã hủy lịch xóa timeline.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/school-semester-timelines/:id/withdraw-cancel-change-request', requireSchoolEventSubmit, async (req, res) => {
  try {
    const role = resolveSchoolUnitRole(req.userRole);
    const timeline = await clubSemesterTimelineService.withdrawCancelChangeRequestForSchoolUnit(req.params.id, role);
    return res.json({ success: true, timeline, message: 'Đã hoàn tác yêu cầu hủy đơn timeline.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/school-semester-timelines/check-conflicts', requireSchoolEventSubmit, async (req, res) => {
  try {
    const { items, excludeTimelineId, submittedAt } = req.body || {};
    const results = await previewFormConflicts({ items, excludeTimelineId, submittedAt });
    return res.json({ success: true, results });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/semester-timelines/check-conflicts', requireCtsvPortal, async (req, res) => {
  try {
    const { location, plannedDate, plannedEndDate, excludeTimelineId, excludeItemIndex, submittedAt } = req.body || {};
    const result = await checkItemConflicts({
      location,
      plannedDate,
      plannedEndDate,
      excludeTimelineId,
      excludeItemIndex,
      submittedAt,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/events/check-venue-conflicts', requireCtsvPortal, async (req, res) => {
  try {
    const { location, startDate, endDate, excludeEventId, excludeTimelineId, excludeItemIndex } = req.body || {};
    const result = await checkEventVenueConflicts({
      location,
      startDate,
      endDate,
      excludeEventId,
      excludeTimelineId,
      excludeItemIndex,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
