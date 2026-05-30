/** Mock data — Đánh giá & Phân tích (Figma SWP391_2, cùng hệ thống admin) */

export const ADMIN_ANALYTICS_PERIODS = [
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
];

export const ADMIN_STAR_DISTRIBUTION = [
  { stars: 5, count: 612, percent: 49 },
  { stars: 4, count: 498, percent: 40 },
  { stars: 3, count: 98, percent: 8 },
  { stars: 2, count: 28, percent: 2 },
  { stars: 1, count: 12, percent: 1 },
];

export const ADMIN_CATEGORY_RATINGS = [
  { id: 'tech', label: 'Học thuật & Công nghệ', avg: 4.8, reviews: 312 },
  { id: 'arts', label: 'Nghệ thuật & Sáng tạo', avg: 4.6, reviews: 198 },
  { id: 'sport', label: 'Thể thao & Sức khỏe', avg: 4.5, reviews: 156 },
  { id: 'music', label: 'Âm nhạc & Giải trí', avg: 4.7, reviews: 142 },
  { id: 'work', label: 'Kỹ năng & Workshop', avg: 4.4, reviews: 128 },
  { id: 'vol', label: 'Tình nguyện & Xã hội', avg: 4.9, reviews: 89 },
];

export const ADMIN_TOP_RATED_EVENTS = [
  { id: 'e1', name: 'FPT TechDay 2024', org: 'F-Code Team', rating: 4.9, reviews: 186, category: 'Học thuật & Công nghệ' },
  { id: 'e2', name: 'Gala FPT 2024', org: 'Ban tổ chức', rating: 4.8, reviews: 124, category: 'Âm nhạc & Giải trí' },
  { id: 'e3', name: 'Workshop AI cơ bản', org: 'FPT AI Club', rating: 4.7, reviews: 98, category: 'Học thuật & Công nghệ' },
  { id: 'e4', name: 'Giải bóng rổ nội bộ', org: 'FPT Basketball', rating: 4.6, reviews: 76, category: 'Thể thao & Sức khỏe' },
  { id: 'e5', name: 'Career Fair 2024', org: 'CTSV', rating: 4.5, reviews: 65, category: 'Kinh tế & Khởi nghiệp' },
];

export const ADMIN_TOP_CLUBS_BY_FEEDBACK = [
  { id: 'c1', name: 'F-Code Team', code: 'CLB_FCODE', reviews: 312, avg: 4.8 },
  { id: 'c2', name: 'FPT AI Club', code: 'CLB_AI', reviews: 245, avg: 4.7 },
  { id: 'c3', name: 'Guitar Club DN', code: 'CLB_GUITAR', reviews: 198, avg: 4.6 },
  { id: 'c4', name: 'FPT Basketball', code: 'CLB_BASKET', reviews: 176, avg: 4.5 },
  { id: 'c5', name: 'Green Heart FPT', code: 'CLB_VOL', reviews: 142, avg: 4.9 },
];

const RECENT_REVIEW_TEMPLATES = [
  { minutesAgo: 12, user: 'Nguyễn Văn A', event: 'FPT TechDay 2024', stars: 5, excerpt: 'Sự kiện rất chuyên nghiệp, nội dung hữu ích.' },
  { minutesAgo: 45, user: 'Trần Thị B', event: 'Workshop AI cơ bản', stars: 4, excerpt: 'Diễn giả tốt, mong có thêm phần thực hành.' },
  { minutesAgo: 120, user: 'Lê Minh C', event: 'Giải bóng rổ nội bộ', stars: 5, excerpt: 'Không khí sôi động, tổ chức ổn định.' },
  { minutesAgo: 180, user: 'Phạm Thu D', event: 'Gala FPT 2024', stars: 5, excerpt: 'Chương trình đa dạng, âm thanh ánh sáng đẹp.' },
  { minutesAgo: 240, user: 'Hoàng Yến E', event: 'Career Fair 2024', stars: 4, excerpt: 'Nhiều doanh nghiệp tham gia, hỗ trợ việc làm tốt.' },
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
  };
};

export const ANALYTICS_PREVIEW_LIMITS = {
  categories: 4,
  events: 3,
  clubs: 3,
  reviews: 3,
};

const MORE_EVENTS = [
  { id: 'e6', name: 'Hackathon FPT 2024', org: 'F-Code Team', rating: 4.4, reviews: 58, category: 'Học thuật & Công nghệ' },
  { id: 'e7', name: 'Ngày hội CLB', org: 'CTSV', rating: 4.3, reviews: 52, category: 'Tình nguyện & Xã hội' },
  { id: 'e8', name: 'Acoustic Night', org: 'Guitar Club DN', rating: 4.6, reviews: 48, category: 'Âm nhạc & Giải trí' },
  { id: 'e9', name: 'FPT Run 2024', org: 'FPT Running', rating: 4.2, reviews: 41, category: 'Thể thao & Sức khỏe' },
  { id: 'e10', name: 'Design Thinking Day', org: 'FPT Design', rating: 4.5, reviews: 36, category: 'Nghệ thuật & Sáng tạo' },
  { id: 'e11', name: 'Startup Pitch', org: 'FPT Startup', rating: 4.1, reviews: 32, category: 'Kinh tế & Khởi nghiệp' },
  { id: 'e12', name: 'Volunteer Day', org: 'Green Heart FPT', rating: 4.9, reviews: 29, category: 'Tình nguyện & Xã hội' },
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
  { minutesAgo: 300, user: 'Võ An F', event: 'Hackathon FPT 2024', stars: 4, excerpt: 'Đội ngũ BTC hỗ trợ nhanh, mentor nhiệt tình.' },
  { minutesAgo: 360, user: 'Đặng Bảo G', event: 'Acoustic Night', stars: 5, excerpt: 'Không gian ấm cúng, MC dẫn chương trình hay.' },
  { minutesAgo: 420, user: 'Bùi Hạ H', event: 'FPT Run 2024', stars: 3, excerpt: 'Đường chạy hơi đông, cần thêm điểm cấp nước.' },
  { minutesAgo: 480, user: 'Ngô Kiên I', event: 'Design Thinking Day', stars: 4, excerpt: 'Bài tập nhóm thực tế, phù hợp sinh viên năm 2.' },
  { minutesAgo: 540, user: 'Dương Lan J', event: 'Startup Pitch', stars: 4, excerpt: 'Jury feedback chi tiết, hữu ích cho ý tưởng khởi nghiệp.' },
  { minutesAgo: 600, user: 'Trịnh Nam K', event: 'Volunteer Day', stars: 5, excerpt: 'Hoạt động ý nghĩa, tổ chức an toàn và rõ ràng.' },
  { minutesAgo: 720, user: 'Lý Phương L', event: 'Ngày hội CLB', stars: 4, excerpt: 'Nhiều gian hàng CLB, dễ tìm thông tin tuyển thành viên.' },
  { minutesAgo: 840, user: 'Mai Quốc M', event: 'FPT TechDay 2024', stars: 5, excerpt: 'Keynote chất lượng, booth demo đa dạng.' },
  { minutesAgo: 960, user: 'Phan Uyên N', event: 'Workshop AI cơ bản', stars: 3, excerpt: 'Slide hơi nhanh, cần tài liệu ôn tập sau buổi.' },
  { minutesAgo: 1080, user: 'Hồ Thảo O', event: 'Gala FPT 2024', stars: 5, excerpt: 'Trang phục và tiết mục văn nghệ ấn tượng.' },
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
    title: 'Phân bổ điểm sao — Chi tiết',
    subtitle: 'Thống kê đầy đủ theo mức sao trong kỳ đã chọn',
  },
  categories: {
    title: 'Đánh giá theo danh mục',
    subtitle: 'Toàn bộ danh mục sự kiện và chỉ số phản hồi',
  },
  events: {
    title: 'Sự kiện được đánh giá cao',
    subtitle: 'Danh sách đầy đủ sự kiện theo điểm trung bình',
  },
  clubs: {
    title: 'Câu lạc bộ theo phản hồi',
    subtitle: 'Danh sách đầy đủ CLB và lượng đánh giá',
  },
  reviews: {
    title: 'Đánh giá gần đây',
    subtitle: 'Toàn bộ phản hồi mới nhất từ người tham dự',
  },
};

export const buildRecentReviews = (now = new Date()) =>
  RECENT_REVIEW_TEMPLATES.map((item, index) => {
    const date = new Date(now.getTime() - item.minutesAgo * 60 * 1000);
    return {
      id: String(index + 1),
      ...item,
      time: date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    };
  });

export const buildAllRecentReviews = (now = new Date()) => {
  const allTemplates = [...RECENT_REVIEW_TEMPLATES, ...MORE_REVIEW_TEMPLATES];
  return allTemplates.map((item, index) => {
    const date = new Date(now.getTime() - item.minutesAgo * 60 * 1000);
    return {
      id: String(index + 1),
      ...item,
      time: date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    };
  });
};
