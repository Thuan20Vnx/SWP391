import { useEffect, useMemo, useState } from 'react';
import {
  ADMIN_ALL_CLUBS_BY_FEEDBACK,
  ADMIN_ALL_RATED_EVENTS,
  ADMIN_CATEGORY_RATINGS,
  ADMIN_STAR_DETAIL_ROWS,
  ADMIN_STAR_DISTRIBUTION,
  ADMIN_TOP_CLUBS_BY_FEEDBACK,
  ADMIN_TOP_RATED_EVENTS,
  buildAllRecentReviews,
  buildAnalyticsOverview,
  buildRecentReviews,
} from '../data/adminAnalyticsData';

export function useAdminAnalyticsLiveData(period = 'month', language = 'vi', tickMs = 60000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return useMemo(
    () => ({
      now,
      overview: buildAnalyticsOverview(period),
      starDistribution: ADMIN_STAR_DISTRIBUTION,
      categoryRatings: ADMIN_CATEGORY_RATINGS,
      topEvents: ADMIN_TOP_RATED_EVENTS,
      topClubs: ADMIN_TOP_CLUBS_BY_FEEDBACK,
      allEvents: ADMIN_ALL_RATED_EVENTS,
      allClubs: ADMIN_ALL_CLUBS_BY_FEEDBACK,
      recentReviews: buildRecentReviews(now, language),
      allReviews: buildAllRecentReviews(now, language),
      starDetailRows: ADMIN_STAR_DETAIL_ROWS,
      maxStarCount: Math.max(...ADMIN_STAR_DISTRIBUTION.map((s) => s.count)),
      maxCategoryReviews: Math.max(...ADMIN_CATEGORY_RATINGS.map((c) => c.reviews)),
    }),
    [now, period, language],
  );
}

export default useAdminAnalyticsLiveData;
