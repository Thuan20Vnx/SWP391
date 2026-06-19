const User = require('../models/User');
const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');
const Club = require('../models/Club');
const Partner = require('../models/Partner');
const EventRegistration = require('../models/EventRegistration');
const Announcement = require('../models/Announcement');
const mongoose = require('mongoose');

const formatVnd = (amount) => {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace('.', ',')} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString('vi-VN')}K`;
  return n.toLocaleString('vi-VN');
};

const getDashboardStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [
    usersTotal,
    usersByRole,
    partnersPending,
    partnersTotal,
    eventsPendingAdmin,
    eventsPending,
    eventsApproved,
    eventsLive,
    eventsTotal,
    proposalsPendingCtsv,
    proposalsPendingIcpdp,
    clubsTotal,
    registrationsTotal,
    registrationsThisMonth,
    announcementsTotal,
    revenueAgg,
    revenueThisMonthAgg,
    revenuePrevMonthAgg,
    recentUsers,
    recentPartners,
    recentEvents,
  ] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Partner.countDocuments({ status: 'pending_admin' }),
    Partner.countDocuments(),
    Event.countDocuments({ status: 'pending_admin', isHidden: { $ne: true } }),
    Event.countDocuments({
      status: { $in: ['pending', 'pending_ctsv', 'pending_icpdp', 'revision'] },
      isHidden: { $ne: true },
    }),
    Event.countDocuments({ status: 'approved', isHidden: { $ne: true } }),
    Event.countDocuments({ status: 'live', isHidden: { $ne: true } }),
    Event.countDocuments({ isHidden: { $ne: true } }),
    EventProposal.countDocuments({ status: 'pending_ctsv' }),
    EventProposal.countDocuments({ status: 'pending_icpdp' }),
    Club.countDocuments(),
    EventRegistration.countDocuments(),
    EventRegistration.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Announcement.countDocuments(),
    Event.aggregate([
      {
        $match: {
          status: { $in: ['approved', 'live', 'ended'] },
          isHidden: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $multiply: [
                { $ifNull: ['$ticketPrice', 0] },
                { $ifNull: ['$registeredCount', 0] },
              ],
            },
          },
        },
      },
    ]),
    Event.aggregate([
      {
        $match: {
          status: { $in: ['approved', 'live', 'ended'] },
          isHidden: { $ne: true },
          updatedAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $multiply: [
                { $ifNull: ['$ticketPrice', 0] },
                { $ifNull: ['$registeredCount', 0] },
              ],
            },
          },
        },
      },
    ]),
    Event.aggregate([
      {
        $match: {
          status: { $in: ['approved', 'live', 'ended'] },
          isHidden: { $ne: true },
          updatedAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $multiply: [
                { $ifNull: ['$ticketPrice', 0] },
                { $ifNull: ['$registeredCount', 0] },
              ],
            },
          },
        },
      },
    ]),
    User.find().sort({ createdAt: -1 }).limit(4).select('fullname email role createdAt').lean(),
    Partner.find().sort({ createdAt: -1 }).limit(3).select('name email status createdAt').lean(),
    Event.find().sort({ updatedAt: -1 }).limit(5).select('title status source updatedAt').lean(),
  ]);

  const roleMap = usersByRole.reduce((acc, row) => {
    acc[row._id || 'unknown'] = row.count;
    return acc;
  }, {});

  const revenueTotal = revenueAgg[0]?.total || 0;
  const revenueThisMonth = revenueThisMonthAgg[0]?.total || 0;
  const revenuePrevMonth = revenuePrevMonthAgg[0]?.total || 0;
  const revenueTrend =
    revenuePrevMonth > 0
      ? `${(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100).toFixed(1).replace('.', ',')}%`
      : revenueThisMonth > 0
        ? '+100%'
        : '0%';

  const monthRanges = Array.from({ length: 6 }, (_, idx) => {
    const offset = 5 - idx;
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { d, next };
  });
  const monthCounts = await Promise.all(
    monthRanges.map(({ d, next }) =>
      Event.countDocuments({
        createdAt: { $gte: d, $lt: next },
        isHidden: { $ne: true },
      }),
    ),
  );
  const monthlyBuckets = monthRanges.map(({ d }, index) => ({
    label: `T${d.getMonth() + 1}`,
    month: `Tháng ${d.getMonth() + 1}`,
    value: monthCounts[index],
  }));

  const peakMonth = monthlyBuckets.reduce(
    (best, item) => (item.value > best.value ? item : best),
    monthlyBuckets[0] || { label: '—', value: 0 },
  );

  const activityLogs = [
    ...recentEvents.map((ev) => ({
      id: `ev-${ev._id}`,
      actor: ev.source === 'school' ? 'CTSV' : ev.source === 'partner' ? 'Đối tác' : 'CLB',
      message: `Sự kiện "${ev.title}" · trạng thái ${ev.status}`,
      tone: ev.status === 'pending_admin' ? 'warning' : 'default',
      time: ev.updatedAt,
    })),
    ...recentPartners.map((p) => ({
      id: `pt-${p._id}`,
      actor: p.name || 'Đối tác',
      message:
        p.status === 'pending_admin'
          ? 'Đăng ký đối tác — chờ Admin duyệt'
          : `Hồ sơ đối tác · ${p.status}`,
      tone: p.status === 'pending_admin' ? 'warning' : 'primary',
      time: p.createdAt,
    })),
    ...recentUsers.map((u) => ({
      id: `usr-${u._id}`,
      actor: u.fullname || u.email,
      message: `Tài khoản mới (${u.role})`,
      tone: 'default',
      time: u.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 12)
    .map((row) => ({
      ...row,
      time: new Date(row.time).toISOString(),
    }));

  const conn = mongoose.connection;

  return {
    checkedAt: now.toISOString(),
    users: {
      total: usersTotal,
      students: roleMap.student || 0,
      ctsv: roleMap.ctsv || 0,
      partners: roleMap.partner || 0,
      admins: roleMap.admin || 0,
      clubManagers: roleMap.club_manager || 0,
    },
    partners: {
      pendingAdmin: partnersPending,
      total: partnersTotal,
    },
    events: {
      pendingAdmin: eventsPendingAdmin,
      pending: eventsPending,
      approved: eventsApproved,
      live: eventsLive,
      total: eventsTotal,
      ongoing: eventsLive + eventsApproved,
    },
    proposals: {
      pendingCtsv: proposalsPendingCtsv,
      pendingIcpdp: proposalsPendingIcpdp,
      pendingTotal: proposalsPendingCtsv + proposalsPendingIcpdp,
    },
    clubs: {
      total: clubsTotal,
    },
    registrations: {
      total: registrationsTotal,
      thisMonth: registrationsThisMonth,
    },
    announcements: { total: announcementsTotal },
    revenue: {
      total: revenueTotal,
      totalFormatted: formatVnd(revenueTotal),
      thisMonth: revenueThisMonth,
      thisMonthFormatted: formatVnd(revenueThisMonth),
      previousMonthFormatted: formatVnd(revenuePrevMonth),
      trend: revenueTrend,
      currency: 'VND',
    },
    traffic: {
      activeSessions: registrationsThisMonth,
      todayRegistrations: registrationsThisMonth,
      totalUsers: usersTotal,
    },
    system: {
      status: conn.readyState === 1 ? 'stable' : 'degraded',
      label: conn.readyState === 1 ? 'ỔN ĐỊNH' : 'CẢNH BÁO',
      database: conn.name || 'FEventsDB',
      host: conn.host || '—',
    },
    monthlyPerformance: monthlyBuckets,
    chartSummary: {
      period: '6 tháng gần nhất',
      avg:
        monthlyBuckets.length > 0
          ? Math.round(
              (monthlyBuckets.reduce((s, m) => s + m.value, 0) / monthlyBuckets.length) * 10,
            ) / 10
          : 0,
      peak: { label: peakMonth.label, value: peakMonth.value },
      growth:
        monthlyBuckets.length >= 2
          ? (() => {
              const last = monthlyBuckets[monthlyBuckets.length - 1].value;
              const prev = monthlyBuckets[monthlyBuckets.length - 2].value;
              if (!prev) return last > 0 ? '+100%' : '0%';
              const pct = ((last - prev) / prev) * 100;
              return `${pct >= 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%`;
            })()
          : '0%',
      growthCaption: 'So với tháng trước',
    },
    peakMonthIndex: monthlyBuckets.findIndex((m) => m.label === peakMonth.label),
    activityLogs,
  };
};

module.exports = { getDashboardStats };
