const Event = require('../models/Event');
const Partner = require('../models/Partner');
const PartnerMember = require('../models/PartnerMember');
const Contract = require('../models/Contract');
const { formatEvent } = require('../utils/eventFormat');
const { resolveReportPhase, getReportDisplayStatus } = require('../constants/ctsvReportDisplay');
const {
  getCtsvReportDetail,
  appendDemoToReportList,
  DEMO_REPORT_EVENT_ID
} = require('./ctsvReport.service');
const AppError = require('../utils/AppError');

const getPartnerRecordsByEmail = async (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return [];
  return Partner.find({ email: normalized }).sort({ createdAt: -1 });
};

const getPartnerIdsByEmail = async (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return [];

  const memberRows = await PartnerMember.find({ email: normalized, isActive: true })
    .select('partnerId')
    .lean();
  if (memberRows.length) {
    return [...new Set(memberRows.map((r) => r.partnerId))];
  }

  const records = await getPartnerRecordsByEmail(email);
  return records.map((p) => p._id);
};

const getPrimaryPartner = async (email) => {
  const records = await getPartnerRecordsByEmail(email);
  if (!records.length) return null;
  const approved = records.find((p) => p.status === 'approved');
  return approved || records[0];
};

const buildPartnerStats = async (email) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  const contracts = partnerIds.length
    ? await Contract.find({ partnerId: { $in: partnerIds } }).lean()
    : [];
  const events = partnerIds.length
    ? await Event.find({ partnerId: { $in: partnerIds } }).lean()
    : [];

  const totalEvents = events.length;
  const totalRegistered = events.reduce((s, e) => s + (e.registeredCount || 0), 0);
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const upcomingCount = events.filter((e) => {
    const start = e.startDate ? new Date(e.startDate) : null;
    return start && start >= now && start <= in48h && ['approved', 'live'].includes(e.status);
  }).length;
  const totalContractAmount = contracts.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const amountLabel =
    totalContractAmount >= 1_000_000
      ? `${Math.round(totalContractAmount / 1_000_000)}M VNĐ`
      : totalContractAmount > 0
        ? `${totalContractAmount.toLocaleString('vi-VN')} đ`
        : '—';

  return {
    stats: [
      {
        label: 'Tổng số sự kiện',
        value: String(totalEvents),
        trend: totalEvents > 0 ? 'Đã liên kết tài khoản' : 'Chưa có sự kiện'
      },
      {
        label: 'Tổng lượt đăng ký',
        value: totalRegistered >= 1000 ? `${(totalRegistered / 1000).toFixed(1)}K` : String(totalRegistered),
        trend: totalRegistered > 0 ? 'Tích lũy' : '—'
      },
      {
        label: 'Sự kiện sắp diễn ra',
        value: String(upcomingCount).padStart(2, '0'),
        trend: upcomingCount > 0 ? 'Sắp khởi động trong 48h' : 'Không có trong 48h'
      },
      {
        label: 'Tổng doanh thu tài trợ',
        value: amountLabel,
        trend: 'Kỳ hiện tại'
      }
    ],
    raw: { totalEvents, totalRegistered, upcomingCount, totalContractAmount }
  };
};

const getPartnerEvents = async (email, query = {}) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  if (!partnerIds.length) return [];

  const filter = { partnerId: { $in: partnerIds } };
  const events = await Event.find(filter).sort({ startDate: -1 }).limit(100);
  let formatted = events.map(formatEvent);

  const q = String(query.q || '').trim().toLowerCase();
  if (q) {
    formatted = formatted.filter(
      (e) =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q)
    );
  }

  const category = query.category;
  if (category && category !== 'Tất cả') {
    formatted = formatted.filter((e) => e.category === category);
  }

  return formatted;
};

const getPartnerEventById = async (email, eventId) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  if (!partnerIds.length) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const owns = partnerIds.some((id) => String(event.partnerId) === String(id));
  if (!owns) {
    throw new AppError('Bạn không có quyền xem sự kiện này!', 403);
  }

  return formatEvent(event);
};

const getPartnerContracts = async (email) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  if (!partnerIds.length) return [];

  const contracts = await Contract.find({ partnerId: { $in: partnerIds } })
    .sort({ createdAt: -1 })
    .populate('partnerId', 'name proposedEventTitle status')
    .lean();

  return contracts.map((c) => ({
    id: c._id.toString(),
    partnerId: c.partnerId?._id?.toString() || String(c.partnerId),
    partnerName: c.partnerId?.name || '',
    proposedEventTitle: c.partnerId?.proposedEventTitle || '',
    title: c.title,
    amount: c.amount,
    status: c.status,
    fileUrl: c.fileUrl || '',
    signedAt: c.signedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));
};

const getPartnerReports = async (email) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  if (!partnerIds.length) return appendDemoToReportList([]);

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
    partnerId: { $in: partnerIds },
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

  return appendDemoToReportList(reports);
};

const getPartnerReportDetail = async (email, eventId) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  const result = await getCtsvReportDetail(eventId);

  if (eventId !== DEMO_REPORT_EVENT_ID && partnerIds.length) {
    const event = await Event.findById(eventId);
    if (event) {
      const owns = partnerIds.some((id) => String(event.partnerId) === String(id));
      if (!owns) {
        throw new AppError('Bạn không có quyền xem báo cáo này!', 403);
      }
    }
  }

  return result.report;
};

const buildActivityFeed = (proposals) =>
  proposals.slice(0, 5).map((p, i) => {
    const statusMessages = {
      pending: `Đề xuất "${p.proposedEventTitle || p.name}" đang chờ CTSV duyệt`,
      pending_admin: `Đề xuất "${p.proposedEventTitle || p.name}" đang chờ Admin duyệt`,
      approved: `Đề xuất "${p.proposedEventTitle || p.name}" đã được phê duyệt`,
      rejected: `Đề xuất "${p.proposedEventTitle || p.name}" đã bị từ chối`,
      info_requested: `CTSV yêu cầu bổ sung hồ sơ: "${p.proposedEventTitle || p.name}"`
    };
    const updated = p.updatedAt || p.createdAt;
    let timeLabel = 'Vừa xong';
    if (updated) {
      const diff = Date.now() - new Date(updated).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) timeLabel = 'Vừa xong';
      else if (hours < 24) timeLabel = `${hours} giờ trước`;
      else timeLabel = `${Math.floor(hours / 24)} ngày trước`;
    }
    return {
      id: p._id?.toString() || i,
      text: statusMessages[p.status] || p.proposedEventTitle || p.name,
      time: timeLabel
    };
  });

module.exports = {
  getPartnerRecordsByEmail,
  getPartnerIdsByEmail,
  getPrimaryPartner,
  buildPartnerStats,
  getPartnerEvents,
  getPartnerEventById,
  getPartnerContracts,
  getPartnerReports,
  getPartnerReportDetail,
  buildActivityFeed
};
