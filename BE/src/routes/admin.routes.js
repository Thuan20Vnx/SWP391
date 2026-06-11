const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const mongoose = require('mongoose');
const { sendPartnerTerminationEmail, sendPartnerAdminNoticeEmail } = require('../services/email.service');
const { createAnnouncement } = require('../services/announcementManage.service');
const adminController = require('../controllers/admin.controller');
const eventChangeRequestController = require('../controllers/eventChangeRequest.controller');
const Partner = require('../models/Partner');
const { resolvePartnerAvatarForAdmin } = require('../utils/partnerAvatar');
const {
  ensurePrimaryPartnerMember,
  listPartnerMembers,
  addPartnerMember,
  deactivatePartnerMember,
} = require('../services/partnerMember.service');
const clubRegistrationService = require('../services/clubRegistration.service');
const Contract = require('../models/Contract');
const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');
const { formatEvent, formatProposal } = require('../utils/eventFormat');
const { ensurePartnerEvent } = require('../utils/announcementEvents');
const {
  buildSchoolEventAdminApproveMeta,
  canAdminApproveSchoolEvent,
  SCHOOL_EVENT_SUBMIT_STATUS
} = require('../constants/eventWorkflow');
const { MODERATION_PENDING_STATUSES } = require('../constants/eventModeration');
const { approveModeration, rejectModeration } = require('../services/eventModeration.service');
const {
  getPublicStatus,
  updateMaintenanceSettings,
} = require('../services/systemSettings.service');

router.use(authMiddleware);

const adminOnly = authorize('admin');
const adminOrCtsv = authorize('admin', 'ctsv');
const adminOrIcpdp = authorize('admin', 'icpdp');

const UNIT_EVENT_PENDING_APPROVED = [
  'pending',
  'pending_ctsv',
  'pending_icpdp',
  'pending_admin',
  'revision',
  'approved',
  'live',
];

const CLUB_PROPOSAL_PENDING = ['pending_icpdp', 'pending_ctsv', 'revision'];

const listEventsForAdmin = (filter, limit = 200) =>
  Event.aggregate([
    { $match: filter },
    { $sort: { _id: -1 } },
    { $limit: limit },
  ]).allowDiskUse(true);

const listProposalsForAdmin = (filter, limit = 200) =>
  EventProposal.aggregate([
    { $match: filter },
    { $sort: { _id: -1 } },
    { $limit: limit },
  ]).allowDiskUse(true);

router.get('/unit-events', async (req, res) => {
  try {
    const { unitType, unitId, scope = 'unit' } = req.query;
    const baseFilter = { isDeleted: { $ne: true } };

    if (scope === 'all') {
      const [events, proposals] = await Promise.all([
        listEventsForAdmin(baseFilter, 500),
        listProposalsForAdmin({ status: { $nin: ['draft', 'cancelled'] } }, 200),
      ]);
      return res.json({
        success: true,
        scope: 'all',
        events: events.map(formatEvent),
        proposals: proposals.map(formatProposal),
      });
    }

    if (!unitType || !unitId) {
      return res.status(400).json({ success: false, message: 'Thiếu unitType hoặc unitId!' });
    }

    const statusFilter = { status: { $in: UNIT_EVENT_PENDING_APPROVED } };
    let eventFilter = { ...baseFilter, ...statusFilter };
    let proposals = [];

    if (unitType === 'partner') {
      const rawId = String(unitId).replace(/^partner-/, '');
      if (!mongoose.isValidObjectId(rawId)) {
        return res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ!' });
      }
      const partner = await Partner.findById(rawId).lean();
      if (!partner) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
      }
      const email = String(partner.email || '').trim().toLowerCase();
      const orClauses = [{ partnerId: partner._id }];
      if (email) {
        orClauses.push({ source: 'partner', createdByEmail: email });
      }
      eventFilter = { ...baseFilter, ...statusFilter, $or: orClauses };
    } else if (unitType === 'clb') {
      const clubId = decodeURIComponent(String(unitId));
      const clubProposals = await EventProposal.find({
        clubId,
        status: { $in: [...CLUB_PROPOSAL_PENDING, 'approved'] },
      }).sort({ createdAt: -1 });
      const proposalIds = clubProposals.map((p) => p._id);
      if (proposalIds.length) {
        eventFilter = { ...baseFilter, ...statusFilter, proposalId: { $in: proposalIds } };
      } else {
        eventFilter = { ...baseFilter, _id: { $in: [] } };
      }
      proposals = clubProposals
        .filter((p) => CLUB_PROPOSAL_PENDING.includes(p.status))
        .map(formatProposal);
    } else {
      return res.status(400).json({ success: false, message: 'Loại đơn vị không hỗ trợ!' });
    }

    const events = await listEventsForAdmin(eventFilter, 200);
    return res.json({
      success: true,
      scope: 'unit',
      events: events.map(formatEvent),
      proposals,
    });
  } catch (error) {
    console.error('admin unit-events:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/system-config', adminOrIcpdp, asyncHandler(async (req, res) => {
  const config = await getPublicStatus();
  res.json({ success: true, config });
}));

router.patch('/system-config', adminOrIcpdp, asyncHandler(async (req, res) => {
  const { maintenanceMode, publicAnnouncements, maintenanceMessage } = req.body || {};
  const config = await updateMaintenanceSettings(
    { maintenanceMode, publicAnnouncements, maintenanceMessage },
    req.authEmail,
  );
  res.json({ success: true, config, message: 'Đã cập nhật cấu hình bảo trì' });
}));

router.get('/events/calendar', adminOnly, async (req, res) => {
  try {
    const events = await Event.find({ isDeleted: { $ne: true } })
      .sort({ startDate: 1 })
      .limit(500);
    return res.json({
      success: true,
      events: events.map(formatEvent),
    });
  } catch (error) {
    console.error('admin calendar:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/club-registrations/pending-count', adminOrIcpdp, async (req, res) => {
  try {
    const count = await clubRegistrationService.countPending();
    return res.json({ success: true, count });
  } catch (error) {
    console.error('club-registrations count:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/club-registrations', adminOrIcpdp, async (req, res) => {
  try {
    const registrations = await clubRegistrationService.listRegistrations({
      status: req.query.status || '',
      q: req.query.q || '',
    });
    return res.json({ success: true, registrations });
  } catch (error) {
    console.error('club-registrations list:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/club-registrations/:id', adminOrIcpdp, async (req, res) => {
  try {
    const registration = await clubRegistrationService.getRegistrationById(req.params.id);
    return res.json({ success: true, registration });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('club-registrations detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/club-registrations/:id/approve', adminOrIcpdp, async (req, res) => {
  try {
    const result = await clubRegistrationService.approveRegistration(req.params.id, {
      note: req.body.note || '',
      reviewerEmail: req.authEmail,
    });
    return res.json({ success: true, ...result, message: 'Đã phê duyệt — CLB mới đã được tạo!' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('club-registrations approve:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/club-registrations/:id/reject', adminOrIcpdp, async (req, res) => {
  try {
    const registration = await clubRegistrationService.rejectRegistration(req.params.id, {
      reason: req.body.reason || req.body.note || '',
      reviewerEmail: req.authEmail,
    });
    return res.json({ success: true, registration });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('club-registrations reject:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/club-registrations/:id/revision', adminOrIcpdp, async (req, res) => {
  try {
    const registration = await clubRegistrationService.requestRevision(req.params.id, {
      note: req.body.note || '',
      reviewerEmail: req.authEmail,
    });
    return res.json({ success: true, registration });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('club-registrations revision:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/accounts', adminOnly, asyncHandler(adminController.listAccounts));
router.post('/accounts', adminOnly, asyncHandler(adminController.createAccount));
router.get('/accounts/:id', adminOnly, asyncHandler(adminController.getAccount));
router.put('/accounts/:id', adminOnly, asyncHandler(adminController.updateAccount));
router.patch('/accounts/:id/status', adminOnly, asyncHandler(adminController.updateAccountStatus));
router.delete('/accounts/:id', adminOnly, asyncHandler(adminController.deleteAccount));
router.get('/data/overview', adminOnly, asyncHandler(adminController.getDataOverview));
router.get('/dashboard/stats', adminOnly, asyncHandler(adminController.getDashboardStats));

router.get('/event-requests', adminOrCtsv, asyncHandler(eventChangeRequestController.list));
router.get('/event-requests/:id', adminOrCtsv, asyncHandler(eventChangeRequestController.getById));
router.patch('/event-requests/:id/approve', adminOrCtsv, asyncHandler(eventChangeRequestController.approve));
router.patch('/event-requests/:id/reject', adminOrCtsv, asyncHandler(eventChangeRequestController.reject));

router.get('/partners', async (req, res) => {
  try {
    const status = req.query.status || 'pending_admin';
    const partners = await Partner.find({ status })
      .sort({ ctsvApprovedAt: -1, createdAt: -1 })
      .lean();
    return res.json({ success: true, partners });
  } catch (error) {
    console.error('admin partners:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/partners/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ!' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
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
    console.error('admin partner detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/partners/:id/members', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ!' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
    const result = await addPartnerMember(partner, req.body || {}, req.authEmail);
    return res.status(201).json({
      success: true,
      member: result.member,
      defaultPassword: result.defaultPassword,
      message: 'Đã thêm tài khoản quản lý cho đối tác.',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('admin add partner member:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.delete('/partners/:id/members/:memberId', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.memberId)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ!' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
    const member = await deactivatePartnerMember(partner, req.params.memberId);
    return res.json({ success: true, member, message: 'Đã vô hiệu hóa tài khoản quản lý.' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('admin remove partner member:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/partners/:id/request-termination', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ!' });
    }
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do yêu cầu hủy!' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }
    if (!['approved', 'pending_admin'].includes(partner.status)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ gửi yêu cầu hủy với đối tác đang hoạt động hoặc chờ duyệt.'
      });
    }
    if (partner.terminationStatus === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Đã có yêu cầu hủy đang chờ xử lý.'
      });
    }

    partner.terminationStatus = 'pending';
    partner.terminationReason = reason;
    partner.terminationRequestedAt = new Date();
    partner.terminationRequestedByEmail = req.authEmail;
    await partner.save();

    const annTitle = `Yêu cầu hủy hợp tác — ${partner.name}`;
    const annContent = `Admin F-Events gửi yêu cầu hủy hợp tác.\n\nLý do: ${reason}\n\nVui lòng đăng nhập cổng đối tác để xác nhận hoặc liên hệ CTSV nếu cần hỗ trợ.`;

    await createAnnouncement(req.authEmail, {
      title: annTitle,
      content: annContent,
      targetRoles: ['partner'],
      targetPartnerId: partner._id,
      targetPartnerEmail: partner.email,
      noticeCategory: 'urgent'
    });

    if (partner.email) {
      sendPartnerTerminationEmail({
        to: partner.email,
        partnerName: partner.name,
        reason,
        adminEmail: req.authEmail
      }).catch((err) => console.error('termination email:', err.message));
    }

    return res.json({
      success: true,
      partner,
      message: 'Đã gửi yêu cầu hủy tới đối tác (email + thông báo).'
    });
  } catch (error) {
    console.error('admin partner termination:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/partners/:id/send-notice', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ!' });
    }
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc!' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }

    const announcement = await createAnnouncement(req.authEmail, {
      title,
      content,
      targetRoles: req.body.targetRoles || ['partner'],
      targetPartnerId: partner._id,
      targetPartnerEmail: partner.email,
      noticeCategory: req.body.noticeCategory || 'info',
      eventId: req.body.eventId || null,
      image: req.body.image || '',
      imageFileName: req.body.imageFileName || ''
    });

    if (partner.email) {
      sendPartnerAdminNoticeEmail({
        to: partner.email,
        partnerName: partner.name,
        title,
        content,
        adminEmail: req.authEmail
      }).catch((err) => console.error('partner notice email:', err.message));
    }

    return res.status(201).json({ success: true, announcement, message: 'Đã gửi thông báo tới đối tác.' });
  } catch (error) {
    console.error('admin partner send-notice:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ nội bộ!'
    });
  }
});

router.patch('/partners/:id/approve', async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đăng ký!' });
    }
    if (partner.status !== 'pending_admin') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ phê duyệt được đơn đã qua CTSV và đang chờ Admin.'
      });
    }
    partner.status = 'approved';
    partner.approvedByEmail = req.authEmail;
    partner.adminApprovedAt = new Date();
    await partner.save();
    await Contract.updateMany(
      { partnerId: partner._id, status: 'pending' },
      { status: 'approved', approvedByEmail: req.authEmail }
    );
    await ensurePartnerEvent(partner);
    return res.json({ success: true, partner, message: 'Đã phê duyệt đối tác thành công.' });
  } catch (error) {
    console.error('admin approve partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/partners/:id/reject', adminOnly, async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối!' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đăng ký!' });
    }
    if (partner.status !== 'pending_admin') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ từ chối được đơn đang chờ Admin phê duyệt.'
      });
    }
    partner.status = 'rejected';
    partner.rejectionReason = reason;
    await partner.save();
    return res.json({ success: true, partner });
  } catch (error) {
    console.error('admin reject partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/school-events', async (req, res) => {
  try {
    const status = req.query.status || SCHOOL_EVENT_SUBMIT_STATUS;
    const events = await Event.find({ source: 'school', status })
      .sort({ ctsvSubmittedAt: -1, createdAt: -1 })
      .lean();
    return res.json({
      success: true,
      events: events.map((ev) => formatEvent(ev))
    });
  } catch (error) {
    console.error('admin school events:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/school-events/:id/approve', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    if (!canAdminApproveSchoolEvent(event)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ phê duyệt được đơn CTSV đã gửi và đang chờ Admin.'
      });
    }
    Object.assign(event, buildSchoolEventAdminApproveMeta(req.authEmail));
    await event.save();
    return res.json({
      success: true,
      event: formatEvent(event),
      message: 'Đã phê duyệt sự kiện cấp trường thành công.'
    });
  } catch (error) {
    console.error('admin approve school event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/school-events/moderation', async (req, res) => {
  try {
    const events = await Event.find({
      status: { $in: MODERATION_PENDING_STATUSES }
    })
      .sort({ moderationRequestedAt: -1, updatedAt: -1 })
      .lean();
    return res.json({
      success: true,
      events: events.map((ev) => formatEvent(ev))
    });
  } catch (error) {
    console.error('admin moderation list:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/school-events/:id/moderation/approve', async (req, res) => {
  try {
    const result = await approveModeration(req.params.id, req.authEmail);
    return res.json({
      success: true,
      event: formatEvent(result.event),
      message: result.message
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('admin moderation approve:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/school-events/:id/moderation/reject', async (req, res) => {
  try {
    const result = await rejectModeration(req.params.id, req.body?.reason, req.authEmail);
    return res.json({
      success: true,
      event: formatEvent(result.event),
      message: result.message
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('admin moderation reject:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/school-events/:id/reject', async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối!' });
    }
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }
    if (!canAdminApproveSchoolEvent(event)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ từ chối được đơn đang chờ Admin phê duyệt.'
      });
    }
    event.status = 'rejected';
    event.rejectionReason = reason;
    await event.save();
    return res.json({ success: true, event: formatEvent(event) });
  } catch (error) {
    console.error('admin reject school event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
