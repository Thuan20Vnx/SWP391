const EventReview = require('../models/EventReview');
const { normalizeEventCategory } = require('../constants/eventCategories');

const PERIOD_LABELS = {
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm nay',
};

/** Số nguyên trong [min, max], ngược lại trả về fallback. */
const parseBounded = (raw, min, max, fallback) => {
  const n = parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
};

/**
 * Khoảng thời gian của kỳ được chọn + kỳ liền trước (để tính xu hướng).
 * `period` là ĐƠN VỊ (month/quarter/year); `month`/`quarter`/`year` chỉ ra kỳ cụ thể,
 * mặc định là kỳ hiện tại. Kỳ hiện tại kết thúc ở `now`, kỳ quá khứ kết thúc trọn kỳ.
 */
const getPeriodBounds = (period, now = new Date(), selection = {}) => {
  const year = parseBounded(selection.year, 2000, 2100, now.getFullYear());
  // Kỳ đã trôi qua thì chốt ở cuối kỳ; kỳ đang diễn ra thì chốt ở thời điểm hiện tại.
  const clampEnd = (rawEnd) => (rawEnd > now ? now : rawEnd);

  if (period === 'year') {
    const start = new Date(year, 0, 1);
    const end = clampEnd(new Date(year + 1, 0, 1, 0, 0, 0, -1));
    return {
      start,
      end,
      prevStart: new Date(year - 1, 0, 1),
      prevEnd: new Date(start.getTime() - 1),
    };
  }

  if (period === 'quarter') {
    const quarter = parseBounded(selection.quarter, 1, 4, Math.floor(now.getMonth() / 3) + 1) - 1;
    const start = new Date(year, quarter * 3, 1);
    const end = clampEnd(new Date(year, quarter * 3 + 3, 1, 0, 0, 0, -1));
    const prevQuarter = quarter === 0 ? 3 : quarter - 1;
    const prevYear = quarter === 0 ? year - 1 : year;
    return {
      start,
      end,
      prevStart: new Date(prevYear, prevQuarter * 3, 1),
      prevEnd: new Date(start.getTime() - 1),
    };
  }

  const month = parseBounded(selection.month, 1, 12, now.getMonth() + 1) - 1;
  const start = new Date(year, month, 1);
  const end = clampEnd(new Date(year, month + 1, 1, 0, 0, 0, -1));
  return {
    start,
    end,
    prevStart: new Date(year, month - 1, 1),
    prevEnd: new Date(start.getTime() - 1),
  };
};

/** Nhãn kỳ hiển thị, ví dụ "Tháng 07/2026", "Quý 3/2026", "Năm 2026". */
const buildPeriodLabel = (period, start) => {
  if (period === 'year') return `Năm ${start.getFullYear()}`;
  if (period === 'quarter') {
    return `Quý ${Math.floor(start.getMonth() / 3) + 1}/${start.getFullYear()}`;
  }
  return `Tháng ${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
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

const getAdminAnalytics = async (period = 'month', selection = {}) => {
  const normalizedPeriod = ['month', 'quarter', 'year'].includes(period) ? period : 'month';
  const now = new Date();
  const { start, end, prevStart, prevEnd } = getPeriodBounds(normalizedPeriod, now, selection);

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
    periodLabel: buildPeriodLabel(normalizedPeriod, start),
    prevPeriodLabel: buildPeriodLabel(normalizedPeriod, prevStart),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    selectedYear: start.getFullYear(),
    selectedMonth: start.getMonth() + 1,
    selectedQuarter: Math.floor(start.getMonth() / 3) + 1,
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

module.exports = { getAdminAnalytics, getPeriodBounds, buildPeriodLabel, PERIOD_LABELS };
