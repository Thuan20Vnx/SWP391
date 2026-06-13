import { useCallback, useEffect, useMemo, useState } from 'react';
import { ANALYTICS_PREVIEW_LIMITS } from '../data/adminAnalyticsData';
import { fetchAdminAnalytics } from '../services/adminApi';
import { formatAnalyticsDateTime } from '../utils/localizeAdminAnalytics';

const EMPTY_OVERVIEW = {
  avgRating: 0,
  avgRatingMax: 5,
  totalReviews: 0,
  satisfactionRate: 0,
  reviewedEvents: 0,
  trendAvg: '0',
  trendReviews: '0%',
  trendCaption: 'so với kỳ trước',
  trendCaptionKey: 'admin.analytics.trendCaption',
};

const formatReviewTime = (review, language) => {
  if (review.time) return review.time;
  if (!review.createdAt) return '—';
  return formatAnalyticsDateTime(new Date(review.createdAt), language);
};

const mapReviewItems = (items, language) =>
  (items || []).map((review) => ({
    ...review,
    time: formatReviewTime(review, language),
  }));

export function useAdminAnalyticsLiveData(period = 'month', language = 'vi', tickMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchAdminAnalytics(period);
      setAnalytics(res.analytics || res);
      setError(null);
    } catch (err) {
      setAnalytics(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  useEffect(() => {
    const id = window.setInterval(refresh, 120000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return useMemo(() => {
    const data = analytics || {};
    const overview = data.overview || EMPTY_OVERVIEW;
    const starDistribution = data.starDistribution || [];
    const categoryRatings = data.categoryRatings || [];
    const topEvents = data.topEvents || [];
    const topClubs = data.topClubs || [];
    const allEvents = data.allEvents || [];
    const allClubs = data.allClubs || [];
    const recentReviews = mapReviewItems(data.recentReviews, language);
    const allReviews = mapReviewItems(data.allReviews, language);

    return {
      now: data.checkedAt ? new Date(data.checkedAt) : now,
      loading,
      error,
      refresh,
      periodLabel: data.periodLabel || '',
      overview,
      starDistribution,
      starDetailRows: data.starDetailRows || [],
      categoryRatings,
      topEvents,
      topClubs,
      allEvents,
      allClubs,
      recentReviews,
      allReviews,
      maxStarCount: data.maxStarCount || 1,
      maxCategoryReviews: data.maxCategoryReviews || 1,
      previewLimits: ANALYTICS_PREVIEW_LIMITS,
      exportPayload: analytics,
    };
  }, [analytics, language, loading, error, refresh, now]);
}

export default useAdminAnalyticsLiveData;
