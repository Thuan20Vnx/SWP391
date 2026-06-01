const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  requireCtsvPortal,
  requireCtsvApprove,
  requireIcpdpOrCtsv
} = require('../middleware/requireRole');
const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');
const Partner = require('../models/Partner');
const { PARTNER_STATUSES } = require('../models/Partner');
const Contract = require('../models/Contract');
const Announcement = require('../models/Announcement');
const { formatEvent, formatProposal } = require('../utils/eventFormat');
const { normalizeSpeakers } = require('../constants/eventSpeaker');
const { normalizeEventCategory } = require('../constants/eventCategories');
const {
  buildSchoolEventSubmitMeta,
  canCtsvEditSchoolEvent,
  shouldResubmitSchoolEventForAdmin,
  SCHOOL_EVENT_SUBMIT_STATUS
} = require('../constants/eventWorkflow');
const { getCtsvReportDetail, appendDemoToReportList } = require('../services/ctsvReport.service');
const { resolveReportPhase, getReportDisplayStatus } = require('../constants/ctsvReportDisplay');
const {
  findLinkableAnnouncementEvents,
  isEventLinkableForAnnouncement
} = require('../utils/announcementEvents');
const { requestModeration } = require('../services/eventModeration.service');

const MAX_IMAGE_DATA_LEN = 4_500_000;

const normalizeTicketTypes = (ticketTypes) => {
  if (!Array.isArray(ticketTypes)) return [];
  return ticketTypes.map((t) => ({
    name: String(t.name || '').trim(),
    priceType: t.priceType === 'paid' ? 'paid' : 'free',
    priceAmount: t.priceType === 'paid' ? Math.max(0, Number(t.priceAmount) || 0) : 0,
    qty: Math.max(0, Number(t.qty) || 0),
    audience: t.audience || 'SV FPT'
  }));
};

const pickSchoolEventFields = (body) => {
  const {
    title,
    description,
    category,
    startDate,
    endDate,
    location,
    totalTickets,
    image,
    bannerFileName,
    eventType,
    duration,
    format,
    speakers,
    agenda,
    expectedAttendees,
    ticketTypes
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

  return {
    title: title?.trim(),
    description: description || '',
    category: normalizeEventCategory(category),
    startDate,
    endDate,
    location: location || '',
    totalTickets: totalTickets || 100,
    capacity: totalTickets || 100,
    image: image || '',
    bannerFileName: bannerFileName || '',
    eventType: eventType || '',
    duration: duration || '',
    format: ['campus', 'online', 'hybrid'].includes(format) ? format : 'campus',
    speakers: normalizedSpeakers,
    speaker: primarySpeaker?.name || '',
    speakerRole: primarySpeaker?.role || '',
    speakerAvatar: primarySpeaker?.avatar || '',
    agenda: agenda || '',
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
  if (query.q) {
    const re = new RegExp(query.q.trim(), 'i');
    filter.$or = [{ title: re }, { location: re }, { category: re }];
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
    const pendingPartners = await Partner.countDocuments({
      status: { $in: ['pending', 'info_requested'] }
    });
    const liveCount = await Event.countDocuments({ status: 'live' });
    const agg = await Event.aggregate([
      { $group: { _id: null, total: { $sum: '$registeredCount' } } }
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
    const events = await Event.find(filter).sort({ startDate: 1 }).limit(100);
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

// GET /api/ctsv/events/:id
router.get('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    return res.json({ success: true, event: formatEvent(event) });
  } catch (error) {
    console.error('ctsv event detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// POST /api/ctsv/events — tạo sự kiện cấp trường
router.post('/events', requireCtsvApprove, async (req, res) => {
  try {
    const data = pickSchoolEventFields(req.body);

    if (!data.title || !data.startDate) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và ngày bắt đầu là bắt buộc!' });
    }

    const event = await Event.create({
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      source: 'school',
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
router.put('/events/:id', requireCtsvApprove, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }

    const data = pickSchoolEventFields(req.body);
    if (!data.title || !data.startDate) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và ngày bắt đầu là bắt buộc!' });
    }

    if (event.source !== 'school') {
      return res.status(403).json({ success: false, message: 'Chỉ cập nhật sự kiện cấp trường!' });
    }

    if (!canCtsvEditSchoolEvent(event)) {
      return res.status(400).json({
        success: false,
        message: 'Cần Admin phê duyệt yêu cầu chỉnh sửa trước khi mở form.'
      });
    }

    Object.assign(event, {
      ...data,
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
router.patch('/events/:id/reject', requireCtsvApprove, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    event.status = 'rejected';
    event.rejectionReason = req.body.reason || req.body.note || '';
    event.approvedByEmail = req.authEmail;
    await event.save();
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
router.patch('/events/:id/publish', requireCtsvApprove, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    if (event.source !== 'school') {
      return res.status(400).json({ success: false, message: 'Chỉ publish sự kiện cấp trường!' });
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
    return res.json({ success: true, report: result.report });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('ctsv report detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// --- Proposals ---

router.get('/proposals', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    else filter.status = { $in: ['pending_ctsv', 'pending_icpdp', 'revision'] };
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
    proposal.status = 'pending_ctsv';
    proposal.icpdpNote = req.body.note || '';
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
    if (!['pending_ctsv', 'pending_icpdp'].includes(proposal.status)) {
      return res.status(400).json({ success: false, message: 'Đề xuất không thể phê duyệt!' });
    }

    const event = await Event.create({
      title: proposal.title,
      description: proposal.description,
      category: proposal.category,
      startDate: proposal.startDate,
      endDate: proposal.endDate,
      location: proposal.location,
      totalTickets: proposal.totalTickets,
      image: proposal.image,
      status: 'approved',
      source: 'club',
      createdByEmail: proposal.submittedByEmail,
      approvedByEmail: req.authEmail,
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
  } catch (error) {
    console.error('ctsv approve proposal:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/proposals/:id/reject', requireCtsvApprove, async (req, res) => {
  try {
    const proposal = await EventProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất!' });
    }
    proposal.status = 'rejected';
    proposal.rejectionReason = req.body.reason || req.body.note || '';
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
    const partners = await Partner.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    const ids = partners.map((p) => p._id);
    const contracts = ids.length
      ? await Contract.find({ partnerId: { $in: ids } }).sort({ createdAt: -1 }).lean()
      : [];
    const contractByPartner = {};
    for (const c of contracts) {
      const key = String(c.partnerId);
      if (!contractByPartner[key]) contractByPartner[key] = c;
    }
    const enriched = partners.map((p) => {
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
    const contracts = await Contract.find({ partnerId: partner._id });
    const PartnerEventRequest = require('../models/PartnerEventRequest');
    const eventRequest = await PartnerEventRequest.findOne({
      partnerId: partner._id,
      status: { $nin: ['draft', 'cancelled', 'deleted'] }
    }).sort({ updatedAt: -1 });
    return res.json({ success: true, partner, contracts, eventRequest: eventRequest || null });
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

module.exports = router;
