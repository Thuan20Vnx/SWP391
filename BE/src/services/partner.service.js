const Event = require('../models/Event');
const Partner = require('../models/Partner');
const PartnerMember = require('../models/PartnerMember');
const Contract = require('../models/Contract');
const { formatEvent, formatEventCard } = require('../utils/eventFormat');

const EVENT_CARD_SELECT =
  'title category startDate location capacity totalTickets registeredCount status image thumbnail source partnerId';
const { resolveReportPhase, getReportDisplayStatus } = require('../constants/ctsvReportDisplay');
const {
  getCtsvReportDetail,
  appendDemoToReportList,
  DEMO_REPORT_EVENT_ID
} = require('./ctsvReport.service');
const { getDiscoveryEvents } = require('./event.service');
const AppError = require('../utils/AppError');

const PARTNER_SUMMARY_SELECT =
  'name email phone representative address description partnerCode category proposedEventTitle expectedSponsorAmount benefits representativeTitle status rejectionReason supplementReason terminationStatus createdAt updatedAt';

const PARTNER_ID_CACHE_TTL_MS = 30_000;
const partnerIdCache = new Map();
const partnerIdInflight = new Map();

const normalizePartnerEmail = (email) => String(email || '').trim().toLowerCase();

const pickPrimaryPartner = (records = []) => {
  if (!records.length) return null;
  return records.find((p) => p.status === 'approved') || records[0];
};

const toPartnerSummary = (doc, { includeLogo = false } = {}) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  const hasLogo = Boolean(o.logo);
  if (!includeLogo) {
    delete o.logo;
  }
  o.id = o._id?.toString?.() || o.id;
  o.hasLogo = hasLogo;
  return o;
};

const loadPartnersByEmail = async (email, { includeLogo = false, lean = true } = {}) => {
  const normalized = normalizePartnerEmail(email);
  if (!normalized) return [];

  const select = includeLogo ? `${PARTNER_SUMMARY_SELECT} logo` : PARTNER_SUMMARY_SELECT;
  let query = Partner.find({ email: normalized }).select(select).sort({ createdAt: -1 });
  if (lean) {
    query = query.lean();
  }
  return query;
};

const resolvePartnerIds = async (normalized) => {
  const memberRows = await PartnerMember.find({ email: normalized, isActive: true })
    .select('partnerId')
    .lean();
  if (memberRows.length) {
    return [...new Set(memberRows.map((r) => r.partnerId))];
  }

  const records = await Partner.find({ email: normalized }).select('_id').lean();
  return records.map((p) => p._id);
};

const getPartnerRecordsByEmail = async (email, options = {}) =>
  loadPartnersByEmail(email, { includeLogo: false, ...options });

const getPartnerIdsByEmail = async (email) => {
  const normalized = normalizePartnerEmail(email);
  if (!normalized) return [];

  const cached = partnerIdCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ids;
  }

  if (partnerIdInflight.has(normalized)) {
    return partnerIdInflight.get(normalized);
  }

  const promise = resolvePartnerIds(normalized)
    .then((ids) => {
      partnerIdCache.set(normalized, { ids, expiresAt: Date.now() + PARTNER_ID_CACHE_TTL_MS });
      return ids;
    })
    .finally(() => {
      partnerIdInflight.delete(normalized);
    });

  partnerIdInflight.set(normalized, promise);
  return promise;
};

const getPrimaryPartner = async (email, options = {}) => {
  const records = await loadPartnersByEmail(email, {
    includeLogo: options.includeLogo === true,
    lean: options.lean !== false
  });
  return pickPrimaryPartner(records);
};

const getPartnerMeData = async (email, { includeLogo = false } = {}) => {
  const [partners, partnerIds] = await Promise.all([
    loadPartnersByEmail(email, { includeLogo }),
    getPartnerIdsByEmail(email)
  ]);

  const primary = pickPrimaryPartner(partners);
  if (!primary && !partnerIds.length) {
    return { partner: null, proposals: [], hasProfile: false, partnerIds: [] };
  }

  return {
    partner: primary ? toPartnerSummary(primary, { includeLogo }) : null,
    proposals: partners.map((p) => toPartnerSummary(p, { includeLogo: false })),
    hasProfile: Boolean(primary || partnerIds.length),
    partnerIds: partnerIds.map(String)
  };
};

const buildPartnerStatsForIds = async (partnerIds) => {
  if (!partnerIds.length) {
    return {
      stats: [
        { label: 'Tổng số sự kiện', value: '0', trend: 'Chưa có sự kiện' },
        { label: 'Tổng lượt đăng ký', value: '0', trend: '—' },
        { label: 'Sự kiện sắp diễn ra', value: '00', trend: 'Không có trong 48h' },
        { label: 'Tổng doanh thu tài trợ', value: '—', trend: 'Kỳ hiện tại' }
      ],
      raw: { totalEvents: 0, totalRegistered: 0, upcomingCount: 0, totalContractAmount: 0 }
    };
  }

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [eventAgg, contractAgg] = await Promise.all([
    Event.aggregate([
      { $match: { partnerId: { $in: partnerIds } } },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          totalRegistered: { $sum: { $ifNull: ['$registeredCount', 0] } },
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
      { $match: { partnerId: { $in: partnerIds } } },
      { $group: { _id: null, totalContractAmount: { $sum: { $ifNull: ['$amount', 0] } } } }
    ])
  ]);

  const totalEvents = eventAgg[0]?.totalEvents || 0;
  const totalRegistered = eventAgg[0]?.totalRegistered || 0;
  const upcomingCount = eventAgg[0]?.upcomingCount || 0;
  const totalContractAmount = contractAgg[0]?.totalContractAmount || 0;
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

const buildPartnerStats = async (email) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  return buildPartnerStatsForIds(partnerIds);
};

const buildPartnerEventFilter = (partnerIds, query = {}) => {
  const filter = { partnerId: { $in: partnerIds } };

  const category = query.category;
  if (category && category !== 'Tất cả') {
    filter.category = category;
  }

  const q = String(query.q || '').trim();
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ title: regex }, { location: regex }, { category: regex }];
  }

  return filter;
};

const getPartnerEventsForIds = async (partnerIds, query = {}) => {
  if (!partnerIds.length) return [];

  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 100);
  const events = await Event.find(buildPartnerEventFilter(partnerIds, query))
    .select(EVENT_CARD_SELECT)
    .sort({ startDate: -1 })
    .limit(limit)
    .lean();

  return events.map(formatEventCard);
};

const getPartnerEvents = async (email, query = {}) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  return getPartnerEventsForIds(partnerIds, query);
};

const getPartnerHomeData = async (email) => {
  const [partnerIds, partners] = await Promise.all([
    getPartnerIdsByEmail(email),
    loadPartnersByEmail(email)
  ]);
  const primary = pickPrimaryPartner(partners);

  const [statsData, events] = await Promise.all([
    buildPartnerStatsForIds(partnerIds),
    getPartnerEventsForIds(partnerIds, { limit: 50 })
  ]);

  return {
    stats: statsData.stats,
    events,
    raw: statsData.raw,
    partnerId: String(primary?._id || partnerIds[0] || ''),
    managedEventIds: events.map((ev) => ev.id).filter(Boolean)
  };
};

const getPartnerCampusEventsData = async (email, user, { limit = 12 } = {}) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  const cappedLimit = Math.min(Math.max(Number(limit) || 12, 1), 48);

  const [discovery, partners, managedRows] = await Promise.all([
    getDiscoveryEvents({ user, limit: cappedLimit, state: 'open' }),
    loadPartnersByEmail(email),
    partnerIds.length
      ? Event.find({ partnerId: { $in: partnerIds } })
          .select('_id')
          .limit(200)
          .lean()
      : Promise.resolve([])
  ]);

  const primary = pickPrimaryPartner(partners);

  return {
    events: discovery.events,
    partnerId: String(primary?._id || partnerIds[0] || ''),
    managedEventIds: managedRows.map((row) => String(row._id))
  };
};

const getPartnerDashboardData = async (email) => {
  const [partnerIds, partners] = await Promise.all([
    getPartnerIdsByEmail(email),
    loadPartnersByEmail(email)
  ]);
  const primary = pickPrimaryPartner(partners);

  const [statsData, events] = await Promise.all([
    buildPartnerStatsForIds(partnerIds),
    getPartnerEventsForIds(partnerIds, { limit: 20 })
  ]);

  return {
    stats: statsData.stats,
    events,
    activity: buildActivityFeed(partners),
    partner: primary ? toPartnerSummary(primary) : null,
    hasProfile: Boolean(primary || partnerIds.length),
    raw: statsData.raw
  };
};

const REPORT_LIST_SELECT =
  'title category startDate endDate location capacity totalTickets registeredCount status eventState source partnerId image thumbnail';

const getPartnerEventById = async (email, eventId) => {
  const partnerIds = await getPartnerIdsByEmail(email);
  if (!partnerIds.length) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const event = await Event.findOne({
    _id: eventId,
    partnerId: { $in: partnerIds }
  }).lean();

  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
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
    .select(REPORT_LIST_SELECT)
    .sort({ startDate: -1 })
    .limit(100)
    .lean();

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

  if (eventId !== DEMO_REPORT_EVENT_ID && partnerIds.length) {
    const owns = await Event.exists({ _id: eventId, partnerId: { $in: partnerIds } });
    if (!owns) {
      throw new AppError('Bạn không có quyền xem báo cáo này!', 403);
    }
  }

  const result = await getCtsvReportDetail(eventId);
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
  getPartnerMeData,
  loadPartnersByEmail,
  buildPartnerStats,
  getPartnerHomeData,
  getPartnerDashboardData,
  getPartnerCampusEventsData,
  getPartnerEvents,
  getPartnerEventById,
  getPartnerContracts,
  getPartnerReports,
  getPartnerReportDetail,
  buildActivityFeed
};
