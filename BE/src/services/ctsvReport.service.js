const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventReview = require('../models/EventReview');
const AppError = require('../utils/AppError');
const { formatEvent } = require('../utils/eventFormat');
const {
  DEMO_REPORT_EVENT_ID,
  buildDemoReportDetail,
  buildDemoReportSummary
} = require('../constants/ctsvDemoReport');
const { resolveReportPhase, getReportDisplayStatus } = require('../constants/ctsvReportDisplay');
const { REPORT_FILL_RATE_LABEL } = require('../constants/ctsvReportLabels');
const mongoose = require('mongoose');

const buildRegistrationTimeline = (registrations) => {
  if (!registrations.length) {
    return [
      { label: 'Tuần 1', count: 0 },
      { label: 'Tuần 2', count: 0 },
      { label: 'Tuần 3', count: 0 },
      { label: 'Tuần 4', count: 0 }
    ];
  }

  const sorted = [...registrations].sort(
    (a, b) => new Date(a.registeredAt) - new Date(b.registeredAt)
  );
  const start = new Date(sorted[0].registeredAt).getTime();
  const end = new Date(sorted[sorted.length - 1].registeredAt).getTime();
  const span = Math.max(end - start, 1);
  const buckets = [
    { label: 'Giai đoạn 1', count: 0 },
    { label: 'Giai đoạn 2', count: 0 },
    { label: 'Giai đoạn 3', count: 0 },
    { label: 'Giai đoạn 4', count: 0 }
  ];

  sorted.forEach((reg) => {
    const t = new Date(reg.registeredAt).getTime();
    const idx = Math.min(3, Math.floor(((t - start) / span) * 4));
    buckets[idx].count += 1;
  });

  return buckets;
};

const buildRatingDistribution = (reviews) => {
  const dist = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length
  }));
  return dist;
};

const buildTicketBreakdown = (event) => {
  const types = event.ticketTypes?.length
    ? event.ticketTypes
    : [{ name: 'Vé chung', qty: event.capacity || event.totalTickets || 0 }];

  return types.map((t) => {
    const capacity = Number(t.qty) || 0;
    const sold = Math.min(capacity, Math.round(capacity * 0.85));
    return {
      name: t.name || 'Vé',
      sold,
      capacity: capacity || sold,
      revenue: 0
    };
  });
};

const buildReportDetailFromEvent = async (event) => {
  const eventId = event._id;
  const registrations = await EventRegistration.find({ event: eventId })
    .populate('user', 'fullname email')
    .sort({ registeredAt: -1 })
    .limit(200);

  const reviews = await EventReview.find({ event: eventId })
    .populate('user', 'fullname email')
    .sort({ createdAt: -1 })
    .limit(20);

  const cap = event.capacity || event.totalTickets || 0;
  const registeredCount = registrations.filter((r) => r.status !== 'cancelled').length;
  const cancelledCount = registrations.filter((r) => r.status === 'cancelled').length;
  const attendedCount = registrations.filter((r) => r.status === 'attended').length;
  const noShowCount = Math.max(0, registeredCount - attendedCount);

  const reviewCount = reviews.length || event.reviewCount || 0;
  const averageRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : event.averageRating || 0;

  const fillRate = cap > 0 ? Math.round((registeredCount / cap) * 100) : 0;
  const attendanceRate =
    registeredCount > 0 ? Math.round((attendedCount / registeredCount) * 100) : 0;

  const formatted = formatEvent(event);
  const reportPhase = resolveReportPhase(event);
  const display = getReportDisplayStatus(reportPhase, event.status);

  return {
    ...formatted,
    status: display.label,
    statusKey: display.statusKey,
    reportPhase,
    isDemo: false,
    stats: {
      totalCapacity: cap,
      registeredCount,
      attendedCount,
      cancelledCount,
      noShowCount,
      fillRate,
      attendanceRate,
      averageRating,
      reviewCount,
      totalRevenue: 0,
      studentRegistrations: registeredCount,
      guestRegistrations: 0
    },
    ticketBreakdown: buildTicketBreakdown(event),
    registrationTimeline: buildRegistrationTimeline(registrations),
    ratingDistribution: buildRatingDistribution(reviews),
    recentReviews: reviews.slice(0, 5).map((r) => ({
      rating: r.rating,
      comment: r.comment || '',
      authorName: r.user?.fullname || r.user?.email || 'Sinh viên',
      createdAt: r.createdAt
    })),
    recentRegistrations: registrations.slice(0, 8).map((r) => ({
      name: r.user?.fullname || '—',
      email: r.user?.email || '',
      status: r.status,
      registeredAt: r.registeredAt
        ? new Date(r.registeredAt).toLocaleDateString('vi-VN')
        : '—'
    })),
    highlights: [
      `${REPORT_FILL_RATE_LABEL} ${fillRate}% (${registeredCount}/${cap || '—'} vé).`,
      attendedCount > 0
        ? `${attendedCount} người check-in (${attendanceRate}% so với đăng ký).`
        : 'Chưa ghi nhận check-in — cập nhật trạng thái attended khi có.',
      reviewCount > 0
        ? `${reviewCount} đánh giá, điểm trung bình ${averageRating}/5.`
        : 'Chưa có đánh giá sau sự kiện.'
    ]
  };
};

const getCtsvReportDetail = async (eventId) => {
  if (eventId === DEMO_REPORT_EVENT_ID) {
    return { report: buildDemoReportDetail() };
  }

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new AppError('Không tìm thấy báo cáo sự kiện!', 404);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện báo cáo!', 404);
  }

  const phase = resolveReportPhase(event);
  if (phase === 'live') {
    throw new AppError(
      'Sự kiện đang diễn ra — xem báo cáo đầy đủ sau khi kết thúc.',
      400
    );
  }

  const report = await buildReportDetailFromEvent(event);
  return { report };
};

const appendDemoToReportList = (reports) => {
  const hasDemo = reports.some((r) => r.id === DEMO_REPORT_EVENT_ID);
  if (hasDemo) return reports;
  return [buildDemoReportSummary(), ...reports];
};

module.exports = {
  getCtsvReportDetail,
  appendDemoToReportList,
  DEMO_REPORT_EVENT_ID
};
