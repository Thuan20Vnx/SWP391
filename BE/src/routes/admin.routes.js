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
const SubmittedCtsvReport = require('../models/SubmittedCtsvReport');
const PartnerMember = require('../models/PartnerMember');
const PartnerEventRequest = require('../models/PartnerEventRequest');
const { formatEvent, formatProposal } = require('../utils/eventFormat');
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
  getEmailPublic,
  getSecurityPublic,
  getPaymentPublic,
  updateEmailSettings,
  updateSecuritySettings,
  updatePaymentSettings,
} = require('../services/systemSettings.service');
const { sendTestEmail } = require('../services/email.service');
const { listAuditLogs } = require('../services/auditLog.service');
const { getAdminPayments, processRefund } = require('../services/payment.service');
const { createAndBroadcast } = require('../services/notification.service');

router.use(authMiddleware);

const adminOnly = authorize('admin');
const adminOrCtsv = authorize('admin', 'ctsv');
const adminOrIcpdp = authorize('admin', 'icpdp');
const icpdpOnly = authorize('icpdp');

const UNIT_EVENT_PENDING_APPROVED = [
  'pending',
  'pending_ctsv',
  'pending_icpdp',
  'pending_admin',
  'revision',
  'approved',
  'live',
];

const CLUB_PROPOSAL_PENDING = ['pending_icpdp', 'pending_ctsv', 'pending_admin', 'revision'];

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
  // Email + Security là cấu hình chỉ Admin được xem
  if (req.userRole === 'admin') {
    const [email, security, payment] = await Promise.all([
      getEmailPublic(),
      getSecurityPublic(),
      getPaymentPublic(),
    ]);
    return res.json({ success: true, config, email, security, payment });
  }
  res.json({ success: true, config });
}));

router.patch('/system-config/payment', adminOnly, asyncHandler(async (req, res) => {
  const payment = await updatePaymentSettings(req.body || {}, req.authEmail);
  res.json({ success: true, payment, message: 'Đã lưu cấu hình thanh toán.' });
}));

router.patch('/system-config/email', adminOnly, asyncHandler(async (req, res) => {
  const email = await updateEmailSettings(req.body || {}, req.authEmail);
  res.json({ success: true, email, message: 'Đã lưu cấu hình email.' });
}));

router.post('/system-config/email/test', adminOnly, asyncHandler(async (req, res) => {
  const to = String(req.body?.to || req.authEmail || '').trim();
  if (!to) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập email nhận thử nghiệm.' });
  }
  try {
    const result = await sendTestEmail(to);
    res.json({
      success: true,
      message: `Đã gửi email thử nghiệm tới ${to}.`,
      previewUrl: result.previewUrl || null,
      provider: result.provider,
    });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message || 'Gửi email thử nghiệm thất bại.' });
  }
}));

router.patch('/system-config/security', adminOnly, asyncHandler(async (req, res) => {
  const security = await updateSecuritySettings(req.body || {}, req.authEmail);
  res.json({ success: true, security, message: 'Đã lưu chính sách bảo mật.' });
}));

// ── Quản lý thanh toán ──────────────────────────────────────────
router.get('/payments', adminOnly, asyncHandler(async (req, res) => {
  const { page, limit, status, eventId, search } = req.query;
  const result = await getAdminPayments({
    page: parseInt(page) || 1,
    limit: Math.min(100, parseInt(limit) || 30),
    status: status || undefined,
    eventId: eventId || undefined,
    search: search || undefined,
  });
  res.json({ success: true, ...result });
}));

router.patch('/payments/:code/refund', adminOnly, asyncHandler(async (req, res) => {
  const { action, note } = req.body || {};
  const result = await processRefund(req.params.code, req.user, action, note);
  res.json({ success: true, ...result, message: action === 'approved' ? 'Đã duyệt hoàn tiền.' : 'Đã từ chối hoàn tiền.' });
}));

router.get('/audit-logs', adminOnly, asyncHandler(async (req, res) => {
  const logs = await listAuditLogs(req.query.limit || 30);
  res.json({ success: true, logs });
}));

router.get('/ctsv-report-submissions', adminOnly, asyncHandler(async (req, res) => {
  const submissions = await SubmittedCtsvReport.find({})
    .sort({ submittedAt: -1, updatedAt: -1 })
    .limit(200)
    .lean();

  const reports = submissions.map((item) => {
    const snapshot = item.snapshot || {};
    const stats = snapshot.stats || {};
    return {
      reportId: item.reportId,
      title: item.title || snapshot.title || '',
      category: item.category || snapshot.category || '',
      source: item.source || snapshot.source || 'school',
      reportPhase: item.reportPhase || snapshot.reportPhase || 'ended',
      date: snapshot.date || '',
      time: snapshot.time || '',
      location: snapshot.location || '',
      registeredCount: stats.registeredCount ?? 0,
      totalTickets: stats.totalCapacity ?? 0,
      fillRate: stats.fillRate ?? 0,
      submittedAt: item.submittedAt,
      submittedByEmail: item.submittedByEmail || '',
      sentToPartnerAt: item.sentToPartnerAt || null,
      partnerEmail: item.partnerEmail || '',
    };
  });

  res.json({ success: true, reports });
}));

router.get('/ctsv-report-submissions/:reportId', adminOnly, asyncHandler(async (req, res) => {
  const submission = await SubmittedCtsvReport.findOne({ reportId: req.params.reportId }).lean();
  if (!submission) {
    return res.status(404).json({ success: false, message: 'Khong tim thay bao cao CTSV da gui.' });
  }
  res.json({
    success: true,
    submission: {
      reportId: submission.reportId,
      submittedAt: submission.submittedAt,
      submittedByEmail: submission.submittedByEmail || '',
    },
    report: submission.snapshot,
  });
}));

router.patch('/system-config', adminOrIcpdp, asyncHandler(async (req, res) => {
  const { maintenanceMode, publicAnnouncements, maintenanceMessage } = req.body || {};
  const config = await updateMaintenanceSettings(
    { maintenanceMode, publicAnnouncements, maintenanceMessage },
    req.authEmail,
  );
  res.json({ success: true, config, message: 'Đã cập nhật cấu hình bảo trì' });
}));

// Tất cả sự kiện đã được duyệt (approved/live/ended/expired)
router.get('/events/approved', adminOnly, asyncHandler(async (req, res) => {
  const APPROVED_STATUSES = ['approved', 'live', 'ended', 'expired'];
  const { source, search, page = 1, limit = 30 } = req.query;

  const filter = { isDeleted: { $ne: true }, status: { $in: APPROVED_STATUSES } };
  if (source && source !== 'all') filter.source = source;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 30);
  const lim = Math.min(100, parseInt(limit) || 30);

  const [events, total] = await Promise.all([
    Event.find(filter).sort({ startDate: -1 }).skip(skip).limit(lim),
    Event.countDocuments(filter),
  ]);

  res.json({ success: true, events: events.map(formatEvent), total, page: parseInt(page), limit: lim });
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
    const count = await clubRegistrationService.countPendingForRole(req.userRole);
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
      viewerRole: req.userRole,
    });
    return res.json({ success: true, registrations });
  } catch (error) {
    console.error('club-registrations list:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.post('/club-registrations', icpdpOnly, async (req, res) => {
  try {
    const registration = await clubRegistrationService.icpdpCreateRegistration(req.body, req.authEmail);
    createAndBroadcast({
      recipientRoles: ['admin'],
      title: 'Đơn thành lập CLB mới (IC-PDP)',
      body: `IC-PDP vừa tạo đơn thành lập CLB "${registration.clubName}". Chờ Admin phê duyệt.`,
      type: 'club_submit',
      refId: String(registration.id || ''),
      refType: 'club_registration'
    }).catch(() => {});
    return res.status(201).json({ success: true, registration, message: 'Đã tạo đơn CLB — chờ Admin phê duyệt.' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('club-registrations create:', error);
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

router.patch('/club-registrations/:id/forward-admin', icpdpOnly, async (req, res) => {
  try {
    const registration = await clubRegistrationService.icpdpForwardToAdmin(req.params.id, {
      note: req.body.note || '',
      reviewerEmail: req.authEmail,
    });
    createAndBroadcast({
      recipientRoles: ['admin'],
      title: 'Đơn thành lập CLB cần Admin duyệt',
      body: `${registration.clubName || 'Một CLB'} đã được IC-PDP duyệt sơ bộ.`,
      type: 'club_submit',
      refId: String(req.params.id),
      refType: 'club_registration'
    }).catch(() => {});
    return res.json({
      success: true,
      registration,
      message: 'Đã chuyển đơn lên Admin phê duyệt.',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('club-registrations forward:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/club-registrations/:id/approve', adminOnly, async (req, res) => {
  try {
    const result = await clubRegistrationService.adminApproveRegistration(req.params.id, {
      note: req.body.note || '',
      reviewerEmail: req.authEmail,
    });
    createAndBroadcast({
      recipientRoles: ['icpdp'],
      recipientEmails: [
        result.registration?.submittedByEmail,
        result.registration?.presidentEmail,
        result.registration?.contactEmail
      ],
      title: 'Đơn thành lập CLB đã được Admin duyệt',
      body: 'Admin đã phê duyệt đơn thành lập CLB mới.',
      type: 'info',
      refId: String(req.params.id),
      refType: 'club_registration'
    }).catch(() => {});

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
      reviewerRole: req.userRole,
    });
    createAndBroadcast({
      recipientEmails: [registration.submittedByEmail, registration.presidentEmail, registration.contactEmail],
      recipientRoles: req.userRole === 'admin' ? ['icpdp'] : [],
      title: 'Đơn thành lập CLB bị từ chối',
      body: registration.rejectionReason || 'Đơn thành lập CLB chưa được chấp nhận.',
      type: 'club_reject',
      refId: String(req.params.id),
      refType: 'club_registration'
    }).catch(() => {});
    return res.json({ success: true, registration });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('club-registrations reject:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/club-registrations/:id/revision', icpdpOnly, async (req, res) => {
  try {
    const registration = await clubRegistrationService.requestRevision(req.params.id, {
      note: req.body.note || '',
      reviewerEmail: req.authEmail,
    });
    createAndBroadcast({
      recipientEmails: [registration.submittedByEmail, registration.presidentEmail, registration.contactEmail],
      title: 'Đơn thành lập CLB cần bổ sung',
      body: registration.icpdpNote || 'IC-PDP yêu cầu bổ sung thông tin cho đơn thành lập CLB.',
      type: 'club_revision',
      refId: String(req.params.id),
      refType: 'club_registration'
    }).catch(() => {});
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
router.patch('/accounts/:id/lock', adminOnly, asyncHandler(adminController.lockAccount));
router.delete('/accounts/:id', adminOnly, asyncHandler(adminController.deleteAccount));
router.get('/data/overview', adminOnly, asyncHandler(adminController.getDataOverview));
router.get('/dashboard/stats', adminOnly, asyncHandler(adminController.getDashboardStats));
router.get('/system-health', adminOnly, asyncHandler(adminController.getSystemHealth));
router.get('/analytics', adminOnly, asyncHandler(adminController.getAnalytics));

router.get('/event-requests', adminOrCtsv, asyncHandler(eventChangeRequestController.list));
router.get('/event-requests/:id', adminOrCtsv, asyncHandler(eventChangeRequestController.getById));
router.patch('/event-requests/:id/approve', adminOrCtsv, asyncHandler(eventChangeRequestController.approve));
router.patch('/event-requests/:id/reject', adminOrCtsv, asyncHandler(eventChangeRequestController.reject));

router.post('/partners', adminOnly, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      representative,
      category,
      representativeTitle,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Tên đối tác là bắt buộc!' });
    }

    const primaryEmail = String(email || '').trim().toLowerCase();

    // Kiểm tra email có thuộc staff/student không trước khi tạo
    if (primaryEmail) {
      const STAFF_ROLES = new Set(['admin', 'ctsv', 'icpdp', 'club_manager', 'staff', 'student']);
      const User = require('../models/User');
      const existing = await User.findOne({ email: primaryEmail }).lean();
      if (existing && STAFF_ROLES.has(existing.role)) {
        return res.status(400).json({
          success: false,
          message: `Email ${primaryEmail} đã thuộc tài khoản ${existing.role} trên hệ thống. Vui lòng dùng email khác.`,
        });
      }
    }

    const partner = await Partner.create({
      name: name.trim(),
      email: primaryEmail,
      phone: String(phone || '').trim(),
      representative: String(representative || '').trim(),
      category: String(category || '').trim(),
      representativeTitle: String(representativeTitle || '').trim(),
      status: 'approved',
      approvedByEmail: req.authEmail,
      adminApprovedAt: new Date(),
    });

    let accountCreated = false;
    let defaultPassword = null;
    if (primaryEmail) {
      try {
        const result = await addPartnerMember(
          partner,
          {
            email: primaryEmail,
            fullname: String(representative || name || '').trim(),
            phone: String(phone || '').trim(),
            title: String(representativeTitle || '').trim(),
            activateNow: true,
          },
          req.authEmail,
        );
        accountCreated = true;
        defaultPassword = result.defaultPassword;
      } catch (memberErr) {
        console.warn('admin create partner — account skipped:', memberErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      partner,
      accountCreated,
      ...(defaultPassword ? { defaultPassword } : {}),
      message: 'Đã thêm đối tác vào hệ thống.',
    });
  } catch (error) {
    console.error('admin create partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.get('/partners', async (req, res) => {
  try {
    const status = String(req.query.status || 'pending_admin').trim();
    const filter = status && status !== 'all' ? { status } : {};
    const partners = await Partner.find(filter)
      .sort({ ctsvApprovedAt: -1, createdAt: -1 })
      .lean();

    const requestsByPartnerId = new Map();
    if (partners.length) {
      const requests = await PartnerEventRequest.find({
        partnerId: { $in: partners.map((p) => p._id) },
        status: { $nin: ['draft', 'cancelled', 'deleted'] }
      })
        .sort({ updatedAt: -1 })
        .select('partnerId image location startDate ticketTypes totalTickets')
        .lean();
      requests.forEach((r) => {
        const key = String(r.partnerId);
        if (!requestsByPartnerId.has(key)) requestsByPartnerId.set(key, r);
      });
    }
    const enriched = partners.map((p) => {
      const r = requestsByPartnerId.get(String(p._id));
      return {
        ...p,
        eventImage: r?.image || '',
        eventLocation: r?.location || '',
        eventStartDate: r?.startDate || null,
        eventTicketTypes: r?.ticketTypes || [],
        eventTotalTickets: r?.totalTickets || null
      };
    });

    return res.json({ success: true, partners: enriched });
  } catch (error) {
    console.error('admin partners:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/partners/:id', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ!' });
    }

    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }

    const {
      name,
      email,
      phone,
      representative,
      category,
      representativeTitle,
      address,
      description,
      partnerCode,
    } = req.body || {};

    const nextName = String(name || '').trim();
    const nextEmail = String(email || '').trim().toLowerCase();
    if (!nextName) {
      return res.status(400).json({ success: false, message: 'Tên đối tác là bắt buộc!' });
    }

    if (nextEmail) {
      const STAFF_ROLES = new Set(['admin', 'ctsv', 'icpdp', 'club_manager', 'staff', 'student']);
      const User = require('../models/User');
      const existingUser = await User.findOne({ email: nextEmail }).lean();
      if (existingUser && STAFF_ROLES.has(existingUser.role)) {
        return res.status(400).json({
          success: false,
          message: `Email ${nextEmail} đã thuộc tài khoản ${existingUser.role} trên hệ thống. Vui lòng dùng email khác.`,
        });
      }
      const conflict = await Partner.findOne({
        email: nextEmail,
        _id: { $ne: partner._id },
      }).lean();
      if (conflict) {
        return res.status(400).json({ success: false, message: 'Email này đã được gắn với đối tác khác.' });
      }
    }

    partner.name = nextName;
    partner.email = nextEmail;
    partner.phone = String(phone || '').trim();
    partner.representative = String(representative || '').trim();
    partner.category = String(category || '').trim();
    partner.representativeTitle = String(representativeTitle || '').trim();
    partner.address = String(address || '').trim();
    partner.description = String(description || '').trim();
    partner.partnerCode = String(partnerCode || '').trim();
    await partner.save();

    await PartnerMember.updateMany(
      { partnerId: partner._id, isPrimary: true },
      {
        $set: {
          fullname: partner.representative || partner.name,
          phone: partner.phone,
          title: partner.representativeTitle,
        },
      },
    );

    return res.json({
      success: true,
      partner,
      message: 'Đã cập nhật thông tin đối tác.',
    });
  } catch (error) {
    console.error('admin update partner:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.delete('/partners/:id', adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ!' });
    }

    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tác!' });
    }

    await Promise.all([
      PartnerMember.deleteMany({ partnerId: partner._id }),
      PartnerEventRequest.deleteMany({ partnerId: partner._id }),
      Contract.deleteMany({ partnerId: partner._id }),
      Event.updateMany({ partnerId: partner._id }, { $set: { partnerId: null } }),
      SubmittedCtsvReport.updateMany(
        { partnerId: partner._id },
        { $set: { partnerId: null, partnerEmail: '' } },
      ),
    ]);

    await Partner.findByIdAndDelete(partner._id);

    return res.json({
      success: true,
      message: 'Đã xóa đối tác khỏi hệ thống. Tài khoản đăng nhập của đối tác không bị xóa.',
    });
  } catch (error) {
    console.error('admin delete partner:', error);
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

    const eventRequest = await PartnerEventRequest.findOne({
      partnerId: partner._id,
      status: 'approved',
      eventId: null
    }).sort({ updatedAt: -1 });
    if (eventRequest) {
      const newEvent = await Event.create({
        title: eventRequest.title || partner.proposedEventTitle || 'Sự kiện đối tác',
        description: eventRequest.description || '',
        category: eventRequest.category,
        registrationStartDate: eventRequest.registrationStartDate,
        registrationEndDate: eventRequest.registrationEndDate,
        startDate: eventRequest.startDate,
        endDate: eventRequest.endDate,
        location: eventRequest.location,
        format: eventRequest.format,
        campus: eventRequest.campus || undefined,
        capacity: eventRequest.totalTickets || undefined,
        totalTickets: eventRequest.totalTickets || undefined,
        ticketTypes: eventRequest.ticketTypes,
        speakers: eventRequest.speakers,
        agenda: eventRequest.agenda,
        learningOutcomes: eventRequest.learningOutcomes,
        expectedAttendees: eventRequest.expectedAttendees || undefined,
        image: eventRequest.image,
        thumbnail: eventRequest.image,
        bannerFileName: eventRequest.bannerFileName,
        eventType: eventRequest.eventType,
        duration: eventRequest.duration,
        source: 'partner',
        partnerId: partner._id,
        status: 'approved',
        createdByEmail: partner.email,
        adminApprovedByEmail: req.authEmail,
        adminApprovedAt: new Date()
      });
      eventRequest.eventId = newEvent._id;
      await eventRequest.save();
    }
    // Tự động tạo tài khoản đăng nhập cho email đại diện nếu chưa có
    const primaryEmail = String(partner.email || '').trim().toLowerCase();
    let accountCreated = false;
    let defaultPassword = null;
    if (primaryEmail) {
      try {
        const result = await addPartnerMember(
          partner,
          {
            email: primaryEmail,
            fullname: String(partner.representative || partner.companyName || '').trim(),
            phone: String(partner.phone || '').trim(),
            title: String(partner.representativeTitle || '').trim(),
            activateNow: true,
          },
          req.authEmail,
        );
        accountCreated = true;
        defaultPassword = result.defaultPassword;
      } catch (memberErr) {
        // Email trùng vai trò nội bộ (staff/student) → chặn approve, rollback
        if (memberErr.message && memberErr.message.includes('Email đã thuộc vai trò khác')) {
          partner.status = 'pending_admin';
          partner.approvedByEmail = undefined;
          partner.adminApprovedAt = undefined;
          await partner.save();
          return res.status(400).json({
            success: false,
            message: `Không thể phê duyệt: ${memberErr.message} Email đại diện phải được cập nhật trước khi duyệt.`,
          });
        }
        // Tài khoản đã tồn tại dạng partner/guest — bỏ qua, không chặn approve
        console.warn('auto-create partner account skipped:', memberErr.message);
      }
    }

    createAndBroadcast({
      recipientRoles: ['ctsv'],
      recipientEmails: [partner.email],
      title: 'Đối tác đã được Admin phê duyệt',
      body: `Admin đã phê duyệt đối tác: ${partner.name}`,
      type: 'info',
      refId: String(partner._id),
      refType: 'partner'
    }).catch(() => {});

    return res.json({
      success: true,
      partner,
      message: 'Đã phê duyệt đối tác thành công.',
      accountCreated,
      ...(defaultPassword ? { defaultPassword } : {}),
    });
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

    const PartnerEventRequest = require('../models/PartnerEventRequest');
    const pendingRequest = await PartnerEventRequest.findOneAndUpdate(
      { partnerId: partner._id, status: { $in: ['pending', 'info_requested', 'approved'] } },
      { $set: { status: 'rejected', rejectionReason: reason } },
      { sort: { updatedAt: -1 } }
    );

    const isEventRequestRejection = Boolean(pendingRequest);
    const title = isEventRequestRejection ? 'Yêu cầu tổ chức sự kiện bị từ chối' : 'Đề xuất đối tác bị từ chối';
    const ctsvBody = isEventRequestRejection
      ? `Admin đã từ chối yêu cầu tổ chức sự kiện "${pendingRequest.title || partner.proposedEventTitle || ''}" của ${partner.name}. Lý do: ${reason}`
      : `Admin đã từ chối đề xuất của ${partner.name}. Lý do: ${reason}`;
    const partnerBody = isEventRequestRejection
      ? `Admin đã từ chối yêu cầu tổ chức sự kiện "${pendingRequest.title || partner.proposedEventTitle || ''}". Lý do: ${reason}`
      : `Admin đã từ chối đề xuất của ${partner.name}. Lý do: ${reason}`;
    createAndBroadcast({
      recipientRoles: ['ctsv'],
      title,
      body: ctsvBody,
      type: 'partner_reject',
      refId: String(partner._id),
      refType: 'partner'
    }).catch(() => {});
    createAndBroadcast({
      recipientEmails: [partner.email],
      title,
      body: partnerBody,
      type: 'partner_reject',
      refId: isEventRequestRejection ? String(pendingRequest._id) : String(partner._id),
      refType: isEventRequestRejection ? 'partner_event_request' : 'partner'
    }).catch(() => {});
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
    createAndBroadcast({
      recipientRoles: [event.schoolOrganizerRole || 'ctsv'],
      recipientEmails: event.ctsvSubmittedByEmail ? [event.ctsvSubmittedByEmail] : [],
      title: 'Sự kiện cấp trường đã được duyệt',
      body: `Admin đã phê duyệt sự kiện: ${event.title}`,
      type: 'event_approve',
      refId: String(event._id),
      refType: 'Event'
    }).catch(() => {});

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
    createAndBroadcast({
      recipientRoles: ['ctsv', 'icpdp'],
      recipientEmails: [result.event?.moderationRequestedByEmail, result.event?.createdByEmail],
      title: 'Yêu cầu điều chỉnh sự kiện đã được duyệt',
      body: `Admin đã duyệt yêu cầu cho sự kiện "${result.event?.title || ''}".`,
      type: 'event_change_approve',
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
    console.error('admin moderation approve:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

router.patch('/school-events/:id/moderation/reject', async (req, res) => {
  try {
    const result = await rejectModeration(req.params.id, req.body?.reason, req.authEmail);
    createAndBroadcast({
      recipientRoles: ['ctsv', 'icpdp'],
      recipientEmails: [result.event?.moderationRequestedByEmail, result.event?.createdByEmail],
      title: 'Yêu cầu điều chỉnh sự kiện bị từ chối',
      body: req.body?.reason || 'Admin chưa chấp nhận yêu cầu điều chỉnh sự kiện.',
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

    createAndBroadcast({
      recipientRoles: [event.schoolOrganizerRole || 'ctsv'],
      recipientEmails: event.ctsvSubmittedByEmail ? [event.ctsvSubmittedByEmail] : [],
      title: 'Sự kiện cấp trường bị từ chối',
      body: `Admin đã từ chối sự kiện "${event.title}". Lý do: ${reason}`,
      type: 'event_reject',
      refId: String(event._id),
      refType: 'Event'
    }).catch(() => {});

    return res.json({ success: true, event: formatEvent(event) });
  } catch (error) {
    console.error('admin reject school event:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
