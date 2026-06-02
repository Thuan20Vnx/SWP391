const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const adminController = require('../controllers/admin.controller');
const eventChangeRequestController = require('../controllers/eventChangeRequest.controller');
const Partner = require('../models/Partner');
const Contract = require('../models/Contract');
const Event = require('../models/Event');
const { formatEvent } = require('../utils/eventFormat');
const { ensurePartnerEvent } = require('../utils/announcementEvents');
const {
  buildSchoolEventAdminApproveMeta,
  canAdminApproveSchoolEvent,
  SCHOOL_EVENT_SUBMIT_STATUS
} = require('../constants/eventWorkflow');
const { MODERATION_PENDING_STATUSES } = require('../constants/eventModeration');
const { approveModeration, rejectModeration } = require('../services/eventModeration.service');

router.use(authMiddleware);

const adminOnly = authorize('admin');
const adminOrCtsv = authorize('admin', 'ctsv');

router.get('/accounts', adminOnly, asyncHandler(adminController.listAccounts));
router.post('/accounts', adminOnly, asyncHandler(adminController.createAccount));
router.get('/accounts/:id', adminOnly, asyncHandler(adminController.getAccount));
router.put('/accounts/:id', adminOnly, asyncHandler(adminController.updateAccount));
router.patch('/accounts/:id/status', adminOnly, asyncHandler(adminController.updateAccountStatus));
router.delete('/accounts/:id', adminOnly, asyncHandler(adminController.deleteAccount));
router.get('/data/overview', adminOnly, asyncHandler(adminController.getDataOverview));

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

router.patch('/partners/:id/reject', async (req, res) => {
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
      source: 'school',
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
