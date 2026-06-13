const EventReview = require('../models/EventReview');
const { normalizeEventCategory } = require('../constants/eventCategories');

const PERIOD_LABELS = {
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm nay',
};

const getPeriodBounds = (period, now = new Date()) => {
  const end = now;

  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(now.getFullYear() - 1, 0, 1);
    return { start, end, prevStart, prevEnd };
  }

  if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    const prevEnd = new Date(start.getTime() - 1);
    const prevQuarter = quarter === 0 ? 3 : quarter - 1;
    const prevYear = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevStart = new Date(prevYear, prevQuarter * 3, 1);
    return { start, end, prevStart, prevEnd };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { start, end, prevStart, prevEnd };
};

const formatTrendPercent = (current, previous) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? '+' : ''}${Math.round(pct)}%`;
};

const formatTrendAvg = (current, previous) => {
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return '0';
  return `${diff > 0 ? '+' : ''}${diff}`;
};

const resolveEventOrg = (event, club) => {
  if (!event?._id) return '—';
  if (club?.name) return club.name;
  if (event?.source === 'school') {
    return event.schoolOrganizerRole === 'icpdp' ? 'IC-PDP' : 'CTSV';
  }
  if (event?.source === 'partner') return 'Đối tác';
  return 'Ban tổ chức';
};

const loadReviewsInRange = async (start, end) =>
  EventReview.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $lookup: {
        from: 'events',
        localField: 'event',
        foreignField: '_id',
        as: 'eventDoc',
      },
    },
    { $unwind: { path: '$eventDoc', preserveNullAndEmptyArrays: true } },
    {
      $match: {
        $or: [
          { eventDoc: null },
          {
            'eventDoc.isDeleted': { $ne: true },
            'eventDoc.isHidden': { $ne: true },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDoc',
      },
    },
    { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'clubs',
        localField: 'eventDoc.clubId',
        foreignField: '_id',
        as: 'clubDoc',
      },
    },
    { $unwind: { path: '$clubDoc', preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: -1 } },
  ]);

const buildOverview = (reviews, prevReviews) => {
  const totalReviews = reviews.length;
  const prevTotal = prevReviews.length;
  const avgRating =
    totalReviews > 0
      ? Math.round((reviews.reduce((sum, row) => sum + row.rating, 0) / totalReviews) * 10) / 10
      : 0;
  const prevAvg =
    prevTotal > 0
      ? Math.round((prevReviews.reduce((sum, row) => sum + row.rating, 0) / prevTotal) * 10) / 10
      : 0;
  const satisfied = reviews.filter((row) => row.rating >= 4).length;
  const satisfactionRate = totalReviews > 0 ? Math.round((satisfied / totalReviews) * 100) : 0;
  const reviewedEvents = new Set(
    reviews.map((row) => (row.eventDoc?._id ? String(row.eventDoc._id) : `orphan-${row._id}`)),
  ).size;

  return {
    avgRating,
    avgRatingMax: 5,
    totalReviews,
    satisfactionRate,
    reviewedEvents,
    trendAvg: formatTrendAvg(avgRating, prevAvg),
    trendReviews: formatTrendPercent(totalReviews, prevTotal),
    trendCaption: 'so với kỳ trước',
    trendCaptionKey: 'admin.analytics.trendCaption',
  };
};

const buildStarDistribution = (reviews) => {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((row) => {
    counts[row.rating] = (counts[row.rating] || 0) + 1;
  });
  const total = reviews.length;

  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars] || 0,
    percent: total > 0 ? Math.round(((counts[stars] || 0) / total) * 100) : 0,
  }));
};

const buildStarDetailRows = (reviews, starDistribution) => {
  const eventSets = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
  reviews.forEach((row) => {
    eventSets[row.rating]?.add(row.eventDoc?._id ? String(row.eventDoc._id) : `orphan-${row._id}`);
  });

  return starDistribution.map((row) => ({
    ...row,
    events: eventSets[row.stars]?.size || 0,
    shareLabel: `${row.percent}% tổng phản hồi`,
  }));
};

const buildCategoryRatings = (reviews) => {
  const map = new Map();
  reviews.forEach((row) => {
    const category = normalizeEventCategory(row.eventDoc?.category || 'Khác');
    const entry = map.get(category) || { id: category, label: category, total: 0, sum: 0 };
    entry.total += 1;
    entry.sum += row.rating;
    map.set(category, entry);
  });

  return [...map.values()]
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      avg: Math.round((entry.sum / entry.total) * 10) / 10,
      reviews: entry.total,
    }))
    .sort((a, b) => b.reviews - a.reviews);
};

const buildEventRatings = (reviews) => {
  const map = new Map();
  reviews.forEach((row) => {
    const event = row.eventDoc;
    const id = event?._id ? String(event._id) : `orphan-${row._id}`;
    const entry = map.get(id) || {
      id,
      name: event?.title || 'Sự kiện không xác định',
      org: resolveEventOrg(event, row.clubDoc),
      category: normalizeEventCategory(event?.category || 'Khác'),
      sum: 0,
      reviews: 0,
    };
    entry.sum += row.rating;
    entry.reviews += 1;
    map.set(id, entry);
  });

  return [...map.values()]
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      org: entry.org,
      category: entry.category,
      rating: Math.round((entry.sum / entry.reviews) * 10) / 10,
      reviews: entry.reviews,
    }))
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
};

const buildClubRatings = (reviews) => {
  const map = new Map();
  reviews.forEach((row) => {
    const club = row.clubDoc;
    if (!club?._id) return;
    const id = String(club._id);
    const code = String(club.slug || club.name || id)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const entry = map.get(id) || {
      id,
      name: club.name,
      code: code.startsWith('CLB_') ? code : `CLB_${code}`.slice(0, 24),
      sum: 0,
      reviews: 0,
    };
    entry.sum += row.rating;
    entry.reviews += 1;
    map.set(id, entry);
  });

  return [...map.values()]
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      code: entry.code,
      avg: Math.round((entry.sum / entry.reviews) * 10) / 10,
      reviews: entry.reviews,
    }))
    .sort((a, b) => b.reviews - a.reviews || b.avg - a.avg);
};

const buildReviewItems = (reviews) =>
  reviews.map((row) => ({
    id: String(row._id),
    user: row.userDoc?.fullname || row.userDoc?.email || 'Người dùng',
    event: row.eventDoc?.title || 'Sự kiện không xác định',
    stars: row.rating,
    excerpt: String(row.comment || '').trim() || '—',
    createdAt: row.createdAt,
  }));

const getAdminAnalytics = async (period = 'month') => {
  const normalizedPeriod = ['month', 'quarter', 'year'].includes(period) ? period : 'month';
  const now = new Date();
  const { start, end, prevStart, prevEnd } = getPeriodBounds(normalizedPeriod, now);

  const [reviews, prevReviews] = await Promise.all([
    loadReviewsInRange(start, end),
    loadReviewsInRange(prevStart, prevEnd),
  ]);

  const starDistribution = buildStarDistribution(reviews);
  const categoryRatings = buildCategoryRatings(reviews);
  const allEvents = buildEventRatings(reviews);
  const allClubs = buildClubRatings(reviews);
  const allReviews = buildReviewItems(reviews);

  return {
    checkedAt: now.toISOString(),
    period: normalizedPeriod,
    periodLabel: PERIOD_LABELS[normalizedPeriod] || PERIOD_LABELS.month,
    overview: buildOverview(reviews, prevReviews),
    starDistribution,
    starDetailRows: buildStarDetailRows(reviews, starDistribution),
    categoryRatings,
    topEvents: allEvents.slice(0, 10),
    topClubs: allClubs.slice(0, 10),
    allEvents,
    allClubs,
    recentReviews: allReviews.slice(0, 20),
    allReviews,
    maxStarCount: Math.max(1, ...starDistribution.map((row) => row.count)),
    maxCategoryReviews: Math.max(1, ...categoryRatings.map((row) => row.reviews), 1),
  };
};

module.exports = { getAdminAnalytics, getPeriodBounds, PERIOD_LABELS };
