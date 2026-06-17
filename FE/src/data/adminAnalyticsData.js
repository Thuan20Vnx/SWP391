/** Mock data — Đánh giá & Phân tích (Figma SWP391_2, cùng hệ thống admin) */

export const ADMIN_ANALYTICS_PERIODS = [
  { value: 'month', labelKey: 'admin.analytics.period.month' },
  { value: 'quarter', labelKey: 'admin.analytics.period.quarter' },
  { value: 'year', labelKey: 'admin.analytics.period.year' },
];

export const ADMIN_STAR_DISTRIBUTION = [
  { stars: 5, count: 612, percent: 49 },
  { stars: 4, count: 498, percent: 40 },
  { stars: 3, count: 98, percent: 8 },
  { stars: 2, count: 28, percent: 2 },
  { stars: 1, count: 12, percent: 1 },
];

export const ADMIN_CATEGORY_RATINGS = [
  { id: 'tech', labelKey: 'admin.analytics.cat.tech', avg: 4.8, reviews: 312 },
  { id: 'arts', labelKey: 'admin.analytics.cat.arts', avg: 4.6, reviews: 198 },
  { id: 'sport', labelKey: 'admin.analytics.cat.sport', avg: 4.5, reviews: 156 },
  { id: 'music', labelKey: 'admin.analytics.cat.music', avg: 4.7, reviews: 142 },
  { id: 'work', labelKey: 'admin.analytics.cat.work', avg: 4.4, reviews: 128 },
  { id: 'vol', labelKey: 'admin.analytics.cat.vol', avg: 4.9, reviews: 89 },
];

export const ADMIN_TOP_RATED_EVENTS = [
  {
    id: 'e1',
    name: 'FPT TechDay 2024',
    org: 'F-Code Team',
    rating: 4.9,
    reviews: 186,
    categoryKey: 'admin.analytics.cat.tech',
  },
  {
    id: 'e2',
    name: 'Gala FPT 2024',
    org: 'Ban tổ chức',
    orgKey: 'admin.analytics.org.organizingCommittee',
    rating: 4.8,
    reviews: 124,
    categoryKey: 'admin.analytics.cat.music',
  },
  {
    id: 'e3',
    name: 'Workshop AI cơ bản',
    nameKey: 'admin.analytics.event.workshopAi',
    org: 'FPT AI Club',
    rating: 4.7,
    reviews: 98,
    categoryKey: 'admin.analytics.cat.tech',
  },
  {
    id: 'e4',
    name: 'Giải bóng rổ nội bộ',
    nameKey: 'admin.analytics.event.internalBasketball',
    org: 'FPT Basketball',
    rating: 4.6,
    reviews: 76,
    categoryKey: 'admin.analytics.cat.sport',
  },
  {
    id: 'e5',
    name: 'Career Fair 2024',
    org: 'CTSV',
    rating: 4.5,
    reviews: 65,
    categoryKey: 'admin.analytics.cat.business',
  },
];

export const ADMIN_TOP_CLUBS_BY_FEEDBACK = [
  { id: 'c1', name: 'F-Code Team', code: 'CLB_FCODE', reviews: 312, avg: 4.8 },
  { id: 'c2', name: 'FPT AI Club', code: 'CLB_AI', reviews: 245, avg: 4.7 },
  { id: 'c3', name: 'Guitar Club DN', code: 'CLB_GUITAR', reviews: 198, avg: 4.6 },
  { id: 'c4', name: 'FPT Basketball', code: 'CLB_BASKET', reviews: 176, avg: 4.5 },
  { id: 'c5', name: 'Green Heart FPT', code: 'CLB_VOL', reviews: 142, avg: 4.9 },
];

const RECENT_REVIEW_TEMPLATES = [
  {
    minutesAgo: 12,
    user: 'Nguyễn Văn A',
    event: 'FPT TechDay 2024',
    stars: 5,
    excerpt: 'Sự kiện rất chuyên nghiệp, nội dung hữu ích.',
    excerptKey: 'admin.analytics.review.1.excerpt',
  },
  {
    minutesAgo: 45,
    user: 'Trần Thị B',
    event: 'Workshop AI cơ bản',
    eventNameKey: 'admin.analytics.event.workshopAi',
    stars: 4,
    excerpt: 'Diễn giả tốt, mong có thêm phần thực hành.',
    excerptKey: 'admin.analytics.review.2.excerpt',
  },
  {
    minutesAgo: 120,
    user: 'Lê Minh C',
    event: 'Giải bóng rổ nội bộ',
    eventNameKey: 'admin.analytics.event.internalBasketball',
    stars: 5,
    excerpt: 'Không khí sôi động, tổ chức ổn định.',
    excerptKey: 'admin.analytics.review.3.excerpt',
  },
  {
    minutesAgo: 180,
    user: 'Phạm Thu D',
    event: 'Gala FPT 2024',
    stars: 5,
    excerpt: 'Chương trình đa dạng, âm thanh ánh sáng đẹp.',
    excerptKey: 'admin.analytics.review.4.excerpt',
  },
  {
    minutesAgo: 240,
    user: 'Hoàng Yến E',
    event: 'Career Fair 2024',
    stars: 4,
    excerpt: 'Nhiều doanh nghiệp tham gia, hỗ trợ việc làm tốt.',
    excerptKey: 'admin.analytics.review.5.excerpt',
  },
];

export const buildAnalyticsOverview = (period = 'month') => {
  const periodScale = period === 'year' ? 4.2 : period === 'quarter' ? 1.8 : 1;
  const totalReviews = Math.round(1248 * periodScale);
  return {
    avgRating: 4.6,
    avgRatingMax: 5,
    totalReviews,
    satisfactionRate: 89,
    reviewedEvents: Math.round(42 * (period === 'year' ? 2.4 : period === 'quarter' ? 1.4 : 1)),
    trendAvg: '+0.2',
    trendReviews: '+12%',
    trendCaption: 'so với kỳ trước',
    trendCaptionKey: 'admin.analytics.trendCaption',
  };
};

export const ANALYTICS_PREVIEW_LIMITS = {
  categories: 4,
  events: 3,
  clubs: 3,
  reviews: 3,
};

const MORE_EVENTS = [
  {
    id: 'e6',
    name: 'Hackathon FPT 2024',
    org: 'F-Code Team',
    rating: 4.4,
    reviews: 58,
    categoryKey: 'admin.analytics.cat.tech',
  },
  {
    id: 'e7',
    name: 'Ngày hội CLB',
    nameKey: 'admin.analytics.event.clubFestival',
    org: 'CTSV',
    rating: 4.3,
    reviews: 52,
    categoryKey: 'admin.analytics.cat.vol',
  },
  {
    id: 'e8',
    name: 'Acoustic Night',
    org: 'Guitar Club DN',
    rating: 4.6,
    reviews: 48,
    categoryKey: 'admin.analytics.cat.music',
  },
  {
    id: 'e9',
    name: 'FPT Run 2024',
    org: 'FPT Running',
    rating: 4.2,
    reviews: 41,
    categoryKey: 'admin.analytics.cat.sport',
  },
  {
    id: 'e10',
    name: 'Design Thinking Day',
    org: 'FPT Design',
    rating: 4.5,
    reviews: 36,
    categoryKey: 'admin.analytics.cat.arts',
  },
  {
    id: 'e11',
    name: 'Startup Pitch',
    org: 'FPT Startup',
    rating: 4.1,
    reviews: 32,
    categoryKey: 'admin.analytics.cat.business',
  },
  {
    id: 'e12',
    name: 'Volunteer Day',
    org: 'Green Heart FPT',
    rating: 4.9,
    reviews: 29,
    categoryKey: 'admin.analytics.cat.vol',
  },
];

const MORE_CLUBS = [
  { id: 'c6', name: 'FPT Running', code: 'CLB_RUN', reviews: 128, avg: 4.4 },
  { id: 'c7', name: 'FPT Design', code: 'CLB_DESIGN', reviews: 115, avg: 4.3 },
  { id: 'c8', name: 'FPT English Club', code: 'CLB_ENG', reviews: 98, avg: 4.2 },
  { id: 'c9', name: 'FPT Dance', code: 'CLB_DANCE', reviews: 86, avg: 4.6 },
  { id: 'c10', name: 'FPT Chess', code: 'CLB_CHESS', reviews: 72, avg: 4.1 },
  { id: 'c11', name: 'FPT Photography', code: 'CLB_PHOTO', reviews: 65, avg: 4.5 },
  { id: 'c12', name: 'FPT Startup', code: 'CLB_STARTUP', reviews: 54, avg: 4.0 },
];

const MORE_REVIEW_TEMPLATES = [
  {
    minutesAgo: 300,
    user: 'Võ An F',
    event: 'Hackathon FPT 2024',
    stars: 4,
    excerpt: 'Đội ngũ BTC hỗ trợ nhanh, mentor nhiệt tình.',
    excerptKey: 'admin.analytics.review.6.excerpt',
  },
  {
    minutesAgo: 360,
    user: 'Đặng Bảo G',
    event: 'Acoustic Night',
    stars: 5,
    excerpt: 'Không gian ấm cúng, MC dẫn chương trình hay.',
    excerptKey: 'admin.analytics.review.7.excerpt',
  },
  {
    minutesAgo: 420,
    user: 'Bùi Hạ H',
    event: 'FPT Run 2024',
    stars: 3,
    excerpt: 'Đường chạy hơi đông, cần thêm điểm cấp nước.',
    excerptKey: 'admin.analytics.review.8.excerpt',
  },
  {
    minutesAgo: 480,
    user: 'Ngô Kiên I',
    event: 'Design Thinking Day',
    stars: 4,
    excerpt: 'Bài tập nhóm thực tế, phù hợp sinh viên năm 2.',
    excerptKey: 'admin.analytics.review.9.excerpt',
  },
  {
    minutesAgo: 540,
    user: 'Dương Lan J',
    event: 'Startup Pitch',
    stars: 4,
    excerpt: 'Jury feedback chi tiết, hữu ích cho ý tưởng khởi nghiệp.',
    excerptKey: 'admin.analytics.review.10.excerpt',
  },
  {
    minutesAgo: 600,
    user: 'Trịnh Nam K',
    event: 'Volunteer Day',
    stars: 5,
    excerpt: 'Hoạt động ý nghĩa, tổ chức an toàn và rõ ràng.',
    excerptKey: 'admin.analytics.review.11.excerpt',
  },
  {
    minutesAgo: 720,
    user: 'Lý Phương L',
    event: 'Ngày hội CLB',
    eventNameKey: 'admin.analytics.event.clubFestival',
    stars: 4,
    excerpt: 'Nhiều gian hàng CLB, dễ tìm thông tin tuyển thành viên.',
    excerptKey: 'admin.analytics.review.12.excerpt',
  },
  {
    minutesAgo: 840,
    user: 'Mai Quốc M',
    event: 'FPT TechDay 2024',
    stars: 5,
    excerpt: 'Keynote chất lượng, booth demo đa dạng.',
    excerptKey: 'admin.analytics.review.13.excerpt',
  },
  {
    minutesAgo: 960,
    user: 'Phan Uyên N',
    event: 'Workshop AI cơ bản',
    eventNameKey: 'admin.analytics.event.workshopAi',
    stars: 3,
    excerpt: 'Slide hơi nhanh, cần tài liệu ôn tập sau buổi.',
    excerptKey: 'admin.analytics.review.14.excerpt',
  },
  {
    minutesAgo: 1080,
    user: 'Hồ Thảo O',
    event: 'Gala FPT 2024',
    stars: 5,
    excerpt: 'Trang phục và tiết mục văn nghệ ấn tượng.',
    excerptKey: 'admin.analytics.review.15.excerpt',
  },
];

export const ADMIN_ALL_RATED_EVENTS = [...ADMIN_TOP_RATED_EVENTS, ...MORE_EVENTS];

export const ADMIN_ALL_CLUBS_BY_FEEDBACK = [...ADMIN_TOP_CLUBS_BY_FEEDBACK, ...MORE_CLUBS];

export const ADMIN_STAR_DETAIL_ROWS = ADMIN_STAR_DISTRIBUTION.map((row) => ({
  ...row,
  events: Math.round(row.count * 0.12),
  shareLabel: `${row.percent}% tổng phản hồi`,
}));

export const ANALYTICS_VIEW_ALL_META = {
  stars: {
    titleKey: 'admin.analytics.viewAll.stars.title',
    subtitleKey: 'admin.analytics.viewAll.stars.subtitle',
  },
  categories: {
    titleKey: 'admin.analytics.viewAll.categories.title',
    subtitleKey: 'admin.analytics.viewAll.categories.subtitle',
  },
  events: {
    titleKey: 'admin.analytics.viewAll.events.title',
    subtitleKey: 'admin.analytics.viewAll.events.subtitle',
  },
  clubs: {
    titleKey: 'admin.analytics.viewAll.clubs.title',
    subtitleKey: 'admin.analytics.viewAll.clubs.subtitle',
  },
  reviews: {
    titleKey: 'admin.analytics.viewAll.reviews.title',
    subtitleKey: 'admin.analytics.viewAll.reviews.subtitle',
  },
};

export const getAnalyticsViewAllMeta = (t) =>
  Object.fromEntries(
    Object.entries(ANALYTICS_VIEW_ALL_META).map(([key, meta]) => [
      key,
      {
        title: t(meta.titleKey),
        subtitle: t(meta.subtitleKey),
      },
    ]),
  );

const formatReviewTime = (date, language = 'vi') => {
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  return date.toLocaleString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const buildRecentReviews = (now = new Date(), language = 'vi') =>
  RECENT_REVIEW_TEMPLATES.map((item, index) => {
    const date = new Date(now.getTime() - item.minutesAgo * 60 * 1000);
    return {
      id: String(index + 1),
      ...item,
      time: formatReviewTime(date, language),
    };
  });

export const buildAllRecentReviews = (now = new Date(), language = 'vi') => {
  const allTemplates = [...RECENT_REVIEW_TEMPLATES, ...MORE_REVIEW_TEMPLATES];
  return allTemplates.map((item, index) => {
    const date = new Date(now.getTime() - item.minutesAgo * 60 * 1000);
    return {
      id: String(index + 1),
      ...item,
      time: formatReviewTime(date, language),
    };
  });
};
