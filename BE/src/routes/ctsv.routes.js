const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  requireCtsvPortal,
  requireCtsvApprove,
  requireSchoolEventSubmit,
  requireProposalModerate,
  requireIcpdpOrCtsv,
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
const { normalizeSpeakers } = require('../constants/eventSpeaker');
const {
  buildSchoolEventSubmitMeta,
  canCtsvEditSchoolEvent,
  shouldResubmitSchoolEventForAdmin,
  resolveSchoolOrganizerRole,
  canRoleManageSchoolEvent,
  SCHOOL_EVENT_SUBMIT_STATUS
} = require('../constants/eventWorkflow');
const { getCtsvReportDetail, appendDemoToReportList } = require('../services/ctsvReport.service');
const {
  submitCtsvReport,
  getSubmissionMeta,
} = require('../services/ctsvReportSubmission.service');
const { resolveReportPhase, getReportDisplayStatus } = require('../constants/ctsvReportDisplay');
const {
  findLinkableAnnouncementEvents,
  isEventLinkableForAnnouncement
} = require('../utils/announcementEvents');
const clubSemesterTimelineService = require('../services/clubSemesterTimeline.service');
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
    ticketPrice
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
    ticketTypes: normalizeTicketTypes(ticketTypes)
  };
};

router.use(authMiddleware);
router.use(requireCtsvPortal);

const buildEventFilter = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.category && query.category !== 'Tất cả') filter.category = query.category;

  const searchOr = buildEventTextSearchOr(query.q || query.search);
  if (searchOr) {
    filter.$or = searchOr;
  }
  if (query.time === 'Hôm nay') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    filter.startDate = { $gte: start, $lte: end };
  } else if (query.time === 'Tuần này') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    filter.startDate = { $gte: start, $lte: end };
  }
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
    let queryBuilder = Event.find(filter);

    if (req.query.sort === 'newest') {
      queryBuilder = queryBuilder.sort({ createdAt: -1 });
    } else if (req.query.sort === 'updated') {
      queryBuilder = queryBuilder.sort({ updatedAt: -1 });
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
    return res.json({
      success: true,
      events: events.map(formatEvent)
    });
  } catch (error) {
    console.error('ctsv events list:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/events/calendar — toàn bộ sự kiện (mọi trạng thái, mọi nguồn)
router.get('/events/calendar', async (req, res) => {
  try {
    const events = await Event.find({}).sort({ startDate: 1 }).limit(500);
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
      .sort({ moderationRequestedAt: -1, updatedAt: -1 })
      .lean();
    return res.json({
      success: true,
      events: events.map((ev) => formatEvent(ev))
    });
  } catch (error) {
    console.error('icpdp moderation list:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
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
    return res.json({ success: true, event: formatEvent(event), students });
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

    const schoolOrganizerRole = resolveSchoolOrganizerRole(req.userRole);

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

    return res.status(201).json({
      success: true,
      event: formatEvent(event),
      message: 'Đã gửi đơn tổ chức sự kiện. Chờ Admin phê duyệt.'
    });
  } catch (error) {
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
    if (shouldResubmitSchoolEventForAdmin(event)) {
      Object.assign(event, buildSchoolEventSubmitMeta(req.authEmail));
      event.rejectionReason = '';
    }
    event.ctsvEditUnlocked = false;
    await event.save();

    return res.json({
      success: true,
      event: formatEvent(event),
      message: 'Đã cập nhật và gửi lại Admin phê duyệt.'
    });
  } catch (error) {
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
    const events = await Event.find({
      status: { $nin: excludedStatuses },
      $or: [
        { status: { $in: ['live', 'ended'] } },
        { eventState: 'expired' },
        { endDate: { $lte: now } },
        { endDate: null, startDate: { $lte: now } },
        { endDate: { $exists: false }, startDate: { $lte: now } }
      ]
    })
      .sort({ startDate: -1 })
      .limit(100);

    const reports = events.map((e) => {
      const cap = e.capacity || e.totalTickets || 0;
      const registered = e.registeredCount || 0;
      const reportPhase = resolveReportPhase(e);
      const display = getReportDisplayStatus(reportPhase, e.status);

      return {
        ...formatEvent(e),
        status: display.label,
        statusKey: display.statusKey,
        registeredCount: registered,
        totalTickets: cap,
        attendanceRate: cap > 0 ? Math.round((registered / cap) * 100) : 0,
        reportPhase
      };
    });

    return res.json({ success: true, reports: appendDemoToReportList(reports) });
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
    const result = await submitCtsvReport(req.params.id, req.authEmail);
    return res.json({
      success: true,
      submission: result.submission,
      sentToAdmin: result.sentToAdmin,
      sentToPartner: result.sentToPartner,
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
    return res.json({ success: true, proposals: proposals.map(formatProposal) });
  } catch (error) {
    console.error('ctsv proposals:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/proposals/:id', async (req, res) => {
  try {
    const proposal = await EventProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất!' });
    }
    return res.json({ success: true, proposal: formatProposal(proposal) });
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
      return res.json({ success: true, proposal: formatProposal(proposal) });
    }
    proposal.status = 'pending_ctsv';
    proposal.icpdpNote = note;
    await proposal.save();
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
    return res.json({ success: true, proposal: formatProposal(proposal) });
  } catch (error) {
    console.error('ctsv reject proposal:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/proposals/:id/request-revision', requireCtsvApprove, async (req, res) => {
  try {
    const proposal = await EventProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất!' });
    }
    proposal.status = 'revision';
    proposal.ctsvNote = req.body.note || '';
    await proposal.save();
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
    }).sort({ updatedAt: -1 });
    return res.json({
      success: true,
      partner: partnerPayload,
      members,
      contracts,
      eventRequest: eventRequest || null
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
    const defaultStatuses =
      req.userRole === 'admin'
        ? ['pending_admin']
        : ['pending_icpdp', 'pending_ctsv', 'revision'];
    const timelines = await clubSemesterTimelineService.listForReview({
      status: req.query.status,
      q: req.query.q,
      defaultStatuses: req.query.status ? null : defaultStatuses,
    });
    return res.json({ success: true, timelines });
  } catch (error) {
    console.error('semester-timelines list:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
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
    if (result?.deleted) {
      return res.json({ success: true, ...result, message: 'Admin đã duyệt — timeline đã xóa.' });
    }
    return res.json({ success: true, timeline: result, message: 'Admin đã duyệt yêu cầu.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/semester-timelines/:id/change-request/reject', requireProposalModerate, async (req, res) => {
  try {
    const stage = req.body.stage === 'admin' ? 'admin' : 'icpdp';
    const timeline = await clubSemesterTimelineService.rejectChangeRequest(req.params.id, {
      reason: req.body.reason,
      reviewerEmail: req.authEmail,
      stage,
    });
    return res.json({ success: true, timeline, message: 'Đã từ chối yêu cầu.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
