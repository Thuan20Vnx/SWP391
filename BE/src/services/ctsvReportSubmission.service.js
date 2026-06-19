const mongoose = require('mongoose');
const Event = require('../models/Event');
const Partner = require('../models/Partner');
const SubmittedCtsvReport = require('../models/SubmittedCtsvReport');
const AppError = require('../utils/AppError');
const { getCtsvReportDetail, DEMO_REPORT_EVENT_ID } = require('./ctsvReport.service');
const { createAnnouncement } = require('./announcementManage.service');
const { sendPartnerCtsvReportEmail } = require('./email.service');

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
    sentToPartnerAt: submission.sentToPartnerAt || null,
    partnerEmail: submission.partnerEmail || '',
    sentToAdmin: Boolean(submission.submittedAt),
    sentToPartner: Boolean(submission.sentToPartnerAt),
  };
};

const upsertSubmission = async ({ report, eventId, authEmail, partnerMeta, sendToPartner }) => {
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

const submitCtsvReport = async (eventId, authEmail) => {
  if (eventId === DEMO_REPORT_EVENT_ID) {
    throw new AppError('Không thể gửi báo cáo demo.', 400);
  }

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
  if (eventId === DEMO_REPORT_EVENT_ID) {
    const { report } = await getCtsvReportDetail(eventId);
    return { ...report, ctsvDelivered: true };
  }

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
  getSubmissionMeta,
  listPartnerSubmittedReports,
  getPartnerSubmittedReportDetail,
};
