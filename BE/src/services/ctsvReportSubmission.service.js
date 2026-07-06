const mongoose = require('mongoose');
const Event = require('../models/Event');
const Partner = require('../models/Partner');
const PartnerMember = require('../models/PartnerMember');
const SubmittedCtsvReport = require('../models/SubmittedCtsvReport');
const AppError = require('../utils/AppError');
const { getCtsvReportDetail } = require('./ctsvReport.service');
const { createAnnouncement } = require('./announcementManage.service');
const { sendPartnerCtsvReportEmail } = require('./email.service');
const { createAndBroadcast } = require('./notification.service');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const buildPartnerAnnouncementContent = (report) => {
  const stats = report.stats || {};
  const highlights = (report.highlights || [])
    .map((line) => `• ${String(line).trim()}`)
    .filter(Boolean)
    .join('\n');

  const lines = [
    `CTSV đã gửi báo cáo sau sự kiện "${report.title || 'Sự kiện đối tác'}".`,
    '',
    `Đăng ký: ${stats.registeredCount ?? 0}/${stats.totalCapacity ?? 0} (${stats.fillRate ?? 0}% lấp đầy)`,
    `Check-in: ${stats.attendedCount ?? 0} người (${stats.attendanceRate ?? 0}% so với đăng ký)`,
    stats.reviewCount
      ? `Đánh giá: ${stats.averageRating ?? 0}/5 (${stats.reviewCount} lượt)`
      : 'Đánh giá: chưa có',
  ];

  if (highlights) {
    lines.push('', 'Điểm nổi bật:', highlights);
  }

  lines.push('', 'Xem chi tiết tại mục Phân tích báo cáo trên cổng đối tác.');
  return lines.join('\n');
};

const resolvePartnerFromEvent = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return { partnerId: null, partnerEmail: '', partnerName: '' };
  }

  const event = await Event.findById(eventId).select('partnerId source').lean();
  if (!event?.partnerId) {
    return { partnerId: null, partnerEmail: '', partnerName: '' };
  }

  const partner = await Partner.findById(event.partnerId).select('email name').lean();
  return {
    partnerId: partner?._id || event.partnerId,
    partnerEmail: normalizeEmail(partner?.email),
    partnerName: String(partner?.name || '').trim(),
  };
};

const getSubmissionMeta = async (reportId) => {
  const submission = await SubmittedCtsvReport.findOne({ reportId: String(reportId) }).lean();
  if (!submission) return null;

  return {
    reportId: submission.reportId,
    submittedAt: submission.submittedAt,
    submittedByEmail: submission.submittedByEmail || '',
    submittedByRole: submission.submittedByRole || '',
    sentToPartnerAt: submission.sentToPartnerAt || null,
    partnerEmail: submission.partnerEmail || '',
    sentToAdmin: Boolean(submission.submittedAt),
    sentToPartner: Boolean(submission.sentToPartnerAt),
    sentToIcpdp: submission.submittedByRole === 'club_manager',
    sentToCtsv: submission.submittedByRole === 'partner',
  };
};

const upsertSubmission = async ({ report, eventId, authEmail, authRole = '', partnerMeta, sendToPartner }) => {
  const reportId = String(report.id || eventId);
  const update = {
    reportId,
    eventId: mongoose.Types.ObjectId.isValid(eventId) ? eventId : null,
    title: report.title || '',
    category: report.category || '',
    source: report.source || 'school',
    reportPhase: report.reportPhase || 'ended',
    snapshot: report,
    submittedByEmail: normalizeEmail(authEmail),
    submittedByRole: String(authRole || '').trim().toLowerCase(),
    submittedAt: new Date(),
  };

  if (sendToPartner && partnerMeta.partnerId) {
    update.partnerId = partnerMeta.partnerId;
    update.partnerEmail = partnerMeta.partnerEmail;
    update.sentToPartnerAt = new Date();
  }

  return SubmittedCtsvReport.findOneAndUpdate(
    { reportId },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const notifyPartner = async ({ authEmail, report, eventId, partnerMeta, submission }) => {
  const title = `Báo cáo sau sự kiện — ${report.title || 'Sự kiện đối tác'}`;
  const content = buildPartnerAnnouncementContent(report);

  const announcement = await createAnnouncement(authEmail, {
    title,
    content,
    eventId: mongoose.Types.ObjectId.isValid(eventId) ? eventId : null,
    targetRoles: ['partner'],
    targetPartnerId: partnerMeta.partnerId,
    targetPartnerEmail: partnerMeta.partnerEmail,
    noticeCategory: 'info',
  });

  submission.partnerAnnouncementId = announcement.id || announcement._id || null;
  await submission.save();

  let emailSent = false;
  if (partnerMeta.partnerEmail) {
    try {
      await sendPartnerCtsvReportEmail({
        to: partnerMeta.partnerEmail,
        partnerName: partnerMeta.partnerName || 'Đối tác',
        eventTitle: report.title || 'Sự kiện đối tác',
        ctsvEmail: authEmail,
        analyticsPath: `/partner/analytics/${report.id || eventId}`,
      });
      emailSent = true;
    } catch (err) {
      console.error('partner report email failed:', err.message);
    }
  }

  return { announcement, emailSent };
};

const submitCtsvReport = async (eventId, authEmail, authRole = 'ctsv') => {
  const { report } = await getCtsvReportDetail(eventId);
  const isPartnerReport = report.source === 'partner';

  if (isPartnerReport) {
    const partnerMeta = await resolvePartnerFromEvent(eventId);
    if (!partnerMeta.partnerId || !partnerMeta.partnerEmail) {
      throw new AppError('Không tìm thấy đối tác liên kết với sự kiện này.', 400);
    }

    const submission = await upsertSubmission({
      report,
      eventId,
      authEmail,
      authRole,
      partnerMeta,
      sendToPartner: true,
    });

    const { emailSent } = await notifyPartner({ authEmail, report, eventId, partnerMeta, submission });

    return {
      submission: {
        reportId: submission.reportId,
        submittedAt: submission.submittedAt,
        submittedByEmail: submission.submittedByEmail,
        sentToPartnerAt: submission.sentToPartnerAt,
        partnerEmail: submission.partnerEmail,
      },
      sentToAdmin: true,
      sentToPartner: true,
      emailSent,
      message: emailSent
        ? 'Đã gửi báo cáo cho Partner và Admin.'
        : 'Đã lưu báo cáo nhưng gửi email cho Partner thất bại.',
    };
  }

  const submission = await upsertSubmission({
    report,
    eventId,
    authEmail,
    authRole,
    partnerMeta: {},
    sendToPartner: false,
  });

  return {
    submission: {
      reportId: submission.reportId,
      submittedAt: submission.submittedAt,
      submittedByEmail: submission.submittedByEmail,
    },
    sentToAdmin: true,
    sentToPartner: false,
    message: 'Đã gửi báo cáo cho Admin xem.',
  };
};

/**
 * CLB nghiệm thu — Câu lạc bộ gửi báo cáo sau sự kiện của chính mình.
 * Báo cáo đến cả IC-PDP và Admin (hai bên đều xem được danh sách báo cáo đã nộp).
 */
const submitClubReport = async (eventId, user) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new AppError('Không tìm thấy sự kiện báo cáo!', 404);
  }

  const event = await Event.findById(eventId).select('createdBy title').lean();
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện báo cáo!', 404);
  }
  if (String(event.createdBy) !== String(user._id)) {
    throw new AppError('Bạn chỉ có thể gửi báo cáo cho sự kiện của câu lạc bộ mình.', 403);
  }

  const { report } = await getCtsvReportDetail(eventId);

  const submission = await upsertSubmission({
    report,
    eventId,
    authEmail: user.email,
    authRole: 'club_manager',
    partnerMeta: {},
    sendToPartner: false,
  });

  const notifTitle = `Báo cáo sau sự kiện — ${report.title || 'Sự kiện CLB'}`;
  const stats = report.stats || {};
  const notifBody = `CLB đã gửi báo cáo nghiệm thu. Đăng ký ${stats.registeredCount ?? 0}/${
    stats.totalCapacity ?? 0
  } (${stats.fillRate ?? 0}%).`;

  await createAndBroadcast({
    recipientRoles: ['icpdp', 'admin'],
    title: notifTitle,
    body: notifBody,
    type: 'report_submitted',
    refId: String(report.id || eventId),
    refType: 'Event',
  });

  return {
    submission: {
      reportId: submission.reportId,
      submittedAt: submission.submittedAt,
      submittedByEmail: submission.submittedByEmail,
      submittedByRole: submission.submittedByRole,
    },
    sentToIcpdp: true,
    sentToAdmin: true,
    message: 'Đã gửi báo cáo nghiệm thu cho IC-PDP và Admin.',
  };
};

/** Danh sách reportId mà CLB (user hiện tại) đã gửi nghiệm thu. */
const listClubSubmittedReports = async (user) => {
  const email = normalizeEmail(user?.email);
  if (!email) return [];

  const submissions = await SubmittedCtsvReport.find({
    submittedByRole: 'club_manager',
    submittedByEmail: email,
  })
    .select('reportId submittedAt')
    .sort({ submittedAt: -1 })
    .limit(200)
    .lean();

  return submissions.map((item) => ({
    reportId: item.reportId,
    submittedAt: item.submittedAt,
  }));
};

/** Các partnerId mà email này sở hữu — đồng bộ logic getPartnerIdsByEmail (partner.service). */
const resolveOwnedPartnerIds = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const [memberRows, partnerRows] = await Promise.all([
    PartnerMember.find({ email: normalized, isActive: true }).select('partnerId').lean(),
    Partner.find({ email: normalized }).select('_id').lean(),
  ]);

  return memberRows.length > 0
    ? [...new Set(memberRows.map((r) => String(r.partnerId)))]
    : partnerRows.map((p) => String(p._id));
};

/**
 * Đối tác tự gửi báo cáo sau sự kiện của chính mình.
 * Báo cáo đến cả CTSV và Admin (hai bên đều xem được danh sách báo cáo đã nộp).
 */
const submitPartnerReport = async (eventId, email) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new AppError('Không tìm thấy sự kiện báo cáo!', 404);
  }

  const event = await Event.findById(eventId).select('partnerId source title').lean();
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện báo cáo!', 404);
  }
  if (event.source !== 'partner') {
    throw new AppError('Chỉ áp dụng cho sự kiện của đối tác.', 400);
  }

  const partnerIds = await resolveOwnedPartnerIds(email);
  const owns = partnerIds.some((id) => String(event.partnerId) === String(id));
  if (!owns) {
    throw new AppError('Bạn chỉ có thể gửi báo cáo cho sự kiện của đối tác mình.', 403);
  }

  const { report } = await getCtsvReportDetail(eventId);

  const submission = await upsertSubmission({
    report,
    eventId,
    authEmail: email,
    authRole: 'partner',
    partnerMeta: {},
    sendToPartner: false,
  });

  const stats = report.stats || {};
  await createAndBroadcast({
    recipientRoles: ['ctsv', 'admin'],
    title: `Báo cáo sau sự kiện — ${report.title || 'Sự kiện đối tác'}`,
    body: `Đối tác đã gửi báo cáo. Đăng ký ${stats.registeredCount ?? 0}/${
      stats.totalCapacity ?? 0
    } (${stats.fillRate ?? 0}%).`,
    type: 'report_submitted',
    refId: String(report.id || eventId),
    refType: 'Event',
  });

  return {
    submission: {
      reportId: submission.reportId,
      submittedAt: submission.submittedAt,
      submittedByEmail: submission.submittedByEmail,
      submittedByRole: submission.submittedByRole,
    },
    sentToCtsv: true,
    sentToAdmin: true,
    message: 'Đã gửi báo cáo cho CTSV và Admin.',
  };
};

/**
 * Danh sách reportId mà chính đối tác (email hiện tại) đã tự gửi.
 * KHÁC với listPartnerSubmittedReports (báo cáo do CTSV gửi CHO đối tác).
 */
const listPartnerOwnSubmittedReports = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const submissions = await SubmittedCtsvReport.find({
    submittedByRole: 'partner',
    submittedByEmail: normalized,
  })
    .select('reportId submittedAt')
    .sort({ submittedAt: -1 })
    .limit(200)
    .lean();

  return submissions.map((item) => ({
    reportId: item.reportId,
    submittedAt: item.submittedAt,
  }));
};

const listPartnerSubmittedReports = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const submissions = await SubmittedCtsvReport.find({
    source: 'partner',
    sentToPartnerAt: { $ne: null },
    $or: [{ partnerEmail: normalized }, { 'snapshot.partnerEmail': normalized }],
  })
    .sort({ sentToPartnerAt: -1, submittedAt: -1 })
    .limit(100)
    .lean();

  return submissions.map((item) => {
    const snapshot = item.snapshot || {};
    const stats = snapshot.stats || {};
    return {
      ...snapshot,
      id: snapshot.id || item.reportId,
      reportId: item.reportId,
      sentToPartnerAt: item.sentToPartnerAt,
      submittedByEmail: item.submittedByEmail || '',
      registeredCount: stats.registeredCount ?? snapshot.registeredCount ?? 0,
      totalTickets: stats.totalCapacity ?? snapshot.totalTickets ?? 0,
      attendanceRate: stats.attendanceRate ?? snapshot.attendanceRate ?? 0,
      ctsvDelivered: true,
    };
  });
};

const getPartnerSubmittedReportDetail = async (email, eventId) => {
  const normalized = normalizeEmail(email);
  const submission = await SubmittedCtsvReport.findOne({
    reportId: String(eventId),
    source: 'partner',
    sentToPartnerAt: { $ne: null },
    partnerEmail: normalized,
  }).lean();

  if (!submission?.snapshot) {
    throw new AppError('Báo cáo chưa được CTSV gửi cho đối tác.', 403);
  }

  return {
    ...submission.snapshot,
    sentToPartnerAt: submission.sentToPartnerAt,
    submittedByEmail: submission.submittedByEmail || '',
    ctsvDelivered: true,
  };
};

module.exports = {
  submitCtsvReport,
  submitClubReport,
  listClubSubmittedReports,
  submitPartnerReport,
  listPartnerOwnSubmittedReports,
  getSubmissionMeta,
  listPartnerSubmittedReports,
  getPartnerSubmittedReportDetail,
};
