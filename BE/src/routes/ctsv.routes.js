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
const Contract = require('../models/Contract');
const Announcement = require('../models/Announcement');
const { formatEvent, formatProposal } = require('../utils/eventFormat');

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
    speaker,
    agenda,
    expectedAttendees,
    ticketTypes
  } = body;

  if (image && image.length > MAX_IMAGE_DATA_LEN) {
    const err = new Error('IMAGE_TOO_LARGE');
    err.code = 'IMAGE_TOO_LARGE';
    throw err;
  }

  return {
    title: title?.trim(),
    description: description || '',
    category: category || 'Khác',
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
    speaker: speaker || '',
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
    const pendingCount = await Event.countDocuments({
      status: { $in: ['pending_ctsv', 'pending_icpdp'] }
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
        { label: 'Sự kiện chờ duyệt', value: String(pendingCount), trend: '+3 tuần này' },
        { label: 'Sự kiện đang diễn ra', value: String(liveCount), trend: 'Ổn định' },
        { label: 'Sinh viên tham gia', value: participantsLabel, trend: '+8%' }
      ],
      raw: { pendingCount, liveCount, participants }
    });
  } catch (error) {
    console.error('ctsv stats:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/events
router.get('/events', async (req, res) => {
  try {
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

// GET /api/ctsv/events/calendar
router.get('/events/calendar', async (req, res) => {
  try {
    const events = await Event.find({
      status: { $in: ['approved', 'live', 'pending_ctsv', 'pending_icpdp'] }
    }).sort({ startDate: 1 });
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
      status: 'approved',
      source: 'school',
      createdByEmail: req.authEmail,
      approvedByEmail: req.authEmail
    });

    return res.status(201).json({ success: true, event: formatEvent(event) });
  } catch (error) {
    if (error.code === 'IMAGE_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        message: 'Ảnh bìa quá lớn. Vui lòng cắt lại hoặc chọn ảnh nhỏ hơn.'
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

    Object.assign(event, {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : event.endDate
    });
    await event.save();

    return res.json({ success: true, event: formatEvent(event) });
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
    if (event.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Chỉ publish sự kiện đã được duyệt!' });
    }
    event.status = 'live';
    await event.save();
    return res.json({ success: true, event: formatEvent(event) });
  } catch (error) {
    console.error('ctsv publish event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/ctsv/reports — báo cáo sau sự kiện (ended)
router.get('/reports', async (req, res) => {
  try {
    const events = await Event.find({ status: { $in: ['ended', 'live'] } })
      .sort({ updatedAt: -1 })
      .limit(50);
    return res.json({
      success: true,
      reports: events.map((e) => ({
        ...formatEvent(e),
        attendanceRate:
          e.totalTickets > 0
            ? Math.round((e.registeredCount / e.totalTickets) * 100)
            : 0
      }))
    });
  } catch (error) {
    console.error('ctsv reports:', error);
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
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const partners = await Partner.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, partners });
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
    return res.json({ success: true, partner, contracts });
  } catch (error) {
    console.error('ctsv partner detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/partners', requireCtsvApprove, async (req, res) => {
  try {
    const { name, email, phone, representative, address, description } = req.body;
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
      status: 'approved',
      approvedByEmail: req.authEmail
    });
    return res.status(201).json({ success: true, partner });
  } catch (error) {
    console.error('ctsv create partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/partners/:id/approve', requireCtsvApprove, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
    partner.status = 'approved';
    partner.approvedByEmail = req.authEmail;
    await partner.save();
    return res.json({ success: true, partner });
  } catch (error) {
    console.error('ctsv approve partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/partners/:id/reject', requireCtsvApprove, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
    partner.status = 'rejected';
    partner.rejectionReason = req.body.reason || '';
    await partner.save();
    return res.json({ success: true, partner });
  } catch (error) {
    console.error('ctsv reject partner:', error);
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
    const list = await Announcement.find().sort({ publishedAt: -1 }).limit(50);
    return res.json({ success: true, announcements: list });
  } catch (error) {
    console.error('ctsv announcements:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/announcements', requireCtsvApprove, async (req, res) => {
  try {
    const { title, content, eventId } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề thông báo là bắt buộc!' });
    }
    const announcement = await Announcement.create({
      title: title.trim(),
      content: content || '',
      eventId: eventId || null,
      publishedByEmail: req.authEmail,
      publishedAt: new Date(),
      isPublished: true
    });
    return res.status(201).json({ success: true, announcement });
  } catch (error) {
    console.error('ctsv publish announcement:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
