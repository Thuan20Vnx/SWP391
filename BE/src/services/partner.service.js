const Event = require('../models/Event');
const Partner = require('../models/Partner');
const PartnerMember = require('../models/PartnerMember');
const Contract = require('../models/Contract');
const PartnerEventRequest = require('../models/PartnerEventRequest');
const { formatEvent } = require('../utils/eventFormat');

const REQUEST_STATUS_LABELS = {
  pending: 'CHỜ DUYỆT',
  info_requested: 'CẦN BỔ SUNG',
  rejected: 'TỪ CHỐI'
};

const formatPendingRequestAsEvent = (doc) => {
  const cap = doc.totalTickets || 0;
  return {
    id: `req-${doc._id}`,
    title: doc.title,
    description: doc.description || '',
    category: doc.category,
    date: doc.startDate ? new Date(doc.startDate).toLocaleDateString('vi-VN') : '',
    time: doc.startDate ? new Date(doc.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
    startDate: doc.startDate,
    endDate: doc.endDate,
    registrationStartDate: doc.registrationStartDate || null,
    registrationEndDate: doc.registrationEndDate || null,
    location: doc.location,
    remainingTickets: cap,
    totalTickets: cap,
    capacity: cap,
    registeredCount: 0,
    status: REQUEST_STATUS_LABELS[doc.status] || doc.status,
    statusKey: doc.status,
    image: doc.image || '',
    thumbnail: doc.image || '',
    eventType: doc.eventType || '',
    format: doc.format || 'campus',
    campus: doc.campus || '',
    agenda: doc.agenda || '',
    learningOutcomes: doc.learningOutcomes || [],
    speakers: doc.speakers || [],
    ticketTypes: doc.ticketTypes || [],
    benefits: doc.benefits || [],
    partnerMessage: doc.partnerMessage || '',
    attachments: doc.attachments || [],
    rejectionReason: doc.rejectionReason || '',
    supplementReason: doc.supplementReason || '',
    source: 'partner',
    isRequest: true
  };
};
const { appendDemoToReportList } = require('./ctsvReport.service');
const {
  listPartnerSubmittedReports,
  getPartnerSubmittedReportDetail,
} = require('./ctsvReportSubmission.service');
const AppError = require('../utils/AppError');
const partnerQueryCache = require('../utils/partnerQueryCache');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const PARTNER_SUMMARY_FIELDS =
  'name email phone representative address description partnerCode category proposedEventTitle expectedSponsorAmount benefits representativeTitle status rejectionReason supplementReason createdAt updatedAt';

const PARTNER_LOGO_FIELDS = `${PARTNER_SUMMARY_FIELDS} logo attachments`;

const EVENT_LIST_FIELDS =
  'title category startDate endDate registrationStartDate registrationEndDate status location image thumbnail registeredCount capacity totalTickets eventType format campus eventState partnerId source ticketPrice ticketTypes speakers.name speakers.role bannerFileName duration isHidden postponeReason postponeIsWeather statusBeforeModeration moderationReason moderationReasonCategory moderationRequestedByEmail moderationRequestedAt icpdpNote ctsvEditUnlocked createdByEmail approvedByEmail ctsvSubmittedByEmail ctsvSubmittedAt adminApprovedByEmail adminApprovedAt ctsvNote rejectionReason expectedRevenue proposalId';

const getPartnerIdsByEmail = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const cacheKey = `${normalized}:partnerIds`;
  const cached = partnerQueryCache.get(cacheKey);
  if (cached) return cached;

  const [memberRows, partnerRows] = await Promise.all([
    PartnerMember.find({ email: normalized, isActive: true }).select('partnerId').lean(),
    Partner.find({ email: normalized }).select('_id').lean()
  ]);

  const ids =
    memberRows.length > 0
      ? [...new Set(memberRows.map((r) => r.partnerId))]
      : partnerRows.map((p) => p._id);

  partnerQueryCache.set(cacheKey, ids);
  return ids;
};

const getPartnerRecordsByEmail = async (email, { includeHeavy = false, limit = 50 } = {}) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const select = includeHeavy ? PARTNER_LOGO_FIELDS : PARTNER_SUMMARY_FIELDS;
  return Partner.find({ email: normalized })
    .sort({ createdAt: -1 })
    .select(select)
    .limit(limit)
    .lean();
};

const getPrimaryPartner = async (email, { includeHeavy = true } = {}) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const select = includeHeavy ? PARTNER_LOGO_FIELDS : PARTNER_SUMMARY_FIELDS;
  const [approved, latest] = await Promise.all([
    Partner.findOne({ email: normalized, status: 'approved' }).select(select).lean(),
    Partner.findOne({ email: normalized }).sort({ createdAt: -1 }).select(select).lean()
  ]);

  return approved || latest || null;
};

const getPartnerMePayload = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { partner: null, proposals: [], hasProfile: false };
  }

  const proposals = await getPartnerRecordsByEmail(normalized, { includeHeavy: false });
  if (!proposals.length) {
    return { partner: null, proposals: [], hasProfile: false };
  }

  const primaryBase = proposals.find((item) => item.status === 'approved') || proposals[0];
  const logoDoc = await Partner.findById(primaryBase._id).select('logo attachments').lean();
  const partner = {
    ...primaryBase,
    logo: logoDoc?.logo || '',
    attachments: logoDoc?.attachments || []
  };

  return { partner, proposals, hasProfile: true };
};

const formatVndAmount = (amount) =>
  amount >= 1_000_000
    ? `${Math.round(amount / 1_000_000)}M VNĐ`
    : amount > 0
      ? `${amount.toLocaleString('vi-VN')} đ`
      : '0 đ';

const buildPartnerStats = async (email, partnerIds = null) => {
  const ids = partnerIds || (await getPartnerIdsByEmail(email));
  if (!ids.length) {
    return {
      stats: [
        { label: 'Tổng số sự kiện', value: '0', trend: 'Chưa có sự kiện' },
        { label: 'Tổng lượt đăng ký', value: '0', trend: '—' },
        { label: 'Sự kiện sắp diễn ra', value: '00', trend: 'Không có trong 48h' },
        { label: 'Tổng doanh thu tài trợ', value: '—', trend: 'Kỳ hiện tại' }
      ],
      raw: { totalEvents: 0, totalRegistered: 0, upcomingCount: 0, totalContractAmount: 0, totalTicketRevenue: 0, activeContractsCount: 0 }
    };
  }

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [eventAgg, contractAgg, activeContractsCount] = await Promise.all([
    Event.aggregate([
      { $match: { partnerId: { $in: ids } } },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          totalRegistered: { $sum: { $ifNull: ['$registeredCount', 0] } },
          totalTicketRevenue: {
            $sum: {
              $multiply: [{ $ifNull: ['$ticketPrice', 0] }, { $ifNull: ['$registeredCount', 0] }]
            }
          },
          upcomingCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$startDate', now] },
                    { $lte: ['$startDate', in48h] },
                    { $in: ['$status', ['approved', 'live']] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]),
    Contract.aggregate([
      { $match: { partnerId: { $in: ids } } },
      {
        $group: {
          _id: null,
          totalContractAmount: { $sum: { $ifNull: ['$amount', 0] } }
        }
      }
    ]),
    Contract.countDocuments({ partnerId: { $in: ids }, status: 'approved' })
  ]);

  const totalEvents = eventAgg[0]?.totalEvents || 0;
  const totalRegistered = eventAgg[0]?.totalRegistered || 0;
  const upcomingCount = eventAgg[0]?.upcomingCount || 0;
  const totalContractAmount = contractAgg[0]?.totalContractAmount || 0;
  const totalTicketRevenue = eventAgg[0]?.totalTicketRevenue || 0;
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
    raw: { totalEvents, totalRegistered, upcomingCount, totalContractAmount, totalTicketRevenue, activeContractsCount }
  };
};

const buildPartnerStatsBundle = async (email) => {
  const normalized = normalizeEmail(email);
  const partnerIds = await getPartnerIdsByEmail(normalized);

  const [statsPayload, proposals] = await Promise.all([
    buildPartnerStats(normalized, partnerIds),
    normalized
      ? Partner.find({ email: normalized })
          .sort({ createdAt: -1 })
          .select(PARTNER_SUMMARY_FIELDS)
          .limit(20)
          .lean()
      : Promise.resolve([])
  ]);

  const pendingProposalsCount = proposals.filter((p) =>
    ['pending', 'pending_admin', 'info_requested'].includes(p.status)
  ).length;

  return {
    ...statsPayload,
    activity: buildActivityFeed(proposals),
    partnership: {
      pendingProposalsCount,
      activeContractsCount: statsPayload.raw?.activeContractsCount || 0,
      ticketRevenueLabel: formatVndAmount(statsPayload.raw?.totalTicketRevenue || 0)
    }
  };
};

const getPartnerEvents = async (email, query = {}) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  if (!partnerIds.length) return [];

  const filter = { partnerId: { $in: partnerIds } };
  const q = String(query.q || '').trim();
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { location: regex }, { category: regex }];
  }

  const category = query.category;
  if (category && category !== 'Tất cả') {
    filter.category = category;
  }

  const events = await Event.find(filter)
    .select(EVENT_LIST_FIELDS)
    .sort({ startDate: -1 })
    .limit(100)
    .lean();

  const requestFilter = { ...filter, partnerId: { $in: partnerIds }, status: { $in: ['pending', 'info_requested', 'rejected'] } };
  const pendingRequests = await PartnerEventRequest.find(requestFilter)
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  const formatted = [
    ...events.map(formatEvent),
    ...pendingRequests.map(formatPendingRequestAsEvent)
  ];

  return formatted.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
};

const getPartnerEventById = async (email, eventId) => {
  if (String(eventId || '').startsWith('req-')) {
    const requestId = eventId.slice(4);
    const doc = await PartnerEventRequest.findById(requestId).lean();
    if (!doc || normalizeEmail(doc.partnerEmail) !== normalizeEmail(email)) {
      throw new AppError('Không tìm thấy sự kiện!', 404);
    }
    return formatPendingRequestAsEvent(doc);
  }

  const partnerIds = await getPartnerIdsByEmail(email);
  if (!partnerIds.length) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const event = await Event.findById(eventId).lean();
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
    .select('partnerId title amount status fileUrl signedAt createdAt updatedAt')
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
  const reports = await listPartnerSubmittedReports(email);
  return appendDemoToReportList(reports);
};

const getPartnerReportDetail = async (email, eventId) => {
  return getPartnerSubmittedReportDetail(email, eventId);
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
  getPartnerMePayload,
  buildPartnerStats,
  buildPartnerStatsBundle,
  getPartnerEvents,
  getPartnerEventById,
  getPartnerContracts,
  getPartnerReports,
  getPartnerReportDetail,
  buildActivityFeed
};
