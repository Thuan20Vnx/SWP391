/**
 * Sự kiện ảo đã kết thúc — dùng demo báo cáo CTSV (không lưu DB).
 */
const { buildFillRateHighlight } = require('./ctsvReportLabels');

const DEMO_REPORT_EVENT_ID = 'demo-ended-event';

const buildDemoReportSummary = () => ({
  id: DEMO_REPORT_EVENT_ID,
  title: 'FPT Career Connect 2025 — Bản demo báo cáo',
  category: 'Công nghệ',
  eventType: 'Hội thảo & Workshop',
  source: 'school',
  date: '15/03/2025',
  time: '08:00',
  location: 'Sảnh tòa Gamma',
  registeredCount: 186,
  totalTickets: 200,
  attendanceRate: 93,
  status: 'ĐÃ KẾT THÚC',
  statusKey: 'ended',
  reportPhase: 'ended',
  image:
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
});

const buildDemoReportDetail = () => ({
  ...buildDemoReportSummary(),
  description:
    'Sự kiện demo minh họa màn hình báo cáo sau khi kết thúc. Dữ liệu là mẫu cố định để CTSV xem layout và số liệu tổng hợp.',
  endDate: '2025-03-15T17:00:00.000Z',
  startDate: '2025-03-15T08:00:00.000Z',
  campus: 'FPTU Đà Nẵng',
  format: 'campus',
  isDemo: true,
  stats: {
    totalCapacity: 200,
    registeredCount: 186,
    attendedCount: 172,
    cancelledCount: 8,
    noShowCount: 6,
    fillRate: 93,
    attendanceRate: 92,
    averageRating: 4.6,
    reviewCount: 124,
    totalRevenue: 0,
    studentRegistrations: 158,
    guestRegistrations: 28
  },
  ticketBreakdown: [
    { name: 'Vé sinh viên', sold: 158, capacity: 170, revenue: 0 },
    { name: 'Vé khách mời', sold: 28, capacity: 30, revenue: 0 }
  ],
  registrationTimeline: [
    { label: 'T-14 ngày', count: 24 },
    { label: 'T-7 ngày', count: 58 },
    { label: 'T-3 ngày', count: 42 },
    { label: 'T-1 ngày', count: 38 },
    { label: 'Ngày SK', count: 24 }
  ],
  ratingDistribution: [
    { stars: 5, count: 78 },
    { stars: 4, count: 32 },
    { stars: 3, count: 10 },
    { stars: 2, count: 3 },
    { stars: 1, count: 1 }
  ],
  recentReviews: [
    {
      rating: 5,
      comment: 'Chương trình rõ ràng, mentor nhiệt tình.',
      authorName: 'Nguyễn Văn A',
      createdAt: '2025-03-16T10:00:00.000Z'
    },
    {
      rating: 4,
      comment: 'Hữu ích cho sinh viên năm cuối tìm việc.',
      authorName: 'Trần Thị B',
      createdAt: '2025-03-16T11:30:00.000Z'
    },
    {
      rating: 5,
      comment: 'Không gian tổ chức tốt, check-in nhanh.',
      authorName: 'Lê Văn C',
      createdAt: '2025-03-16T14:00:00.000Z'
    }
  ],
  recentRegistrations: [
    { name: 'Phạm Minh D', email: 'dpm@fpt.edu.vn', status: 'attended', registeredAt: '2025-03-01' },
    { name: 'Hoàng Thị E', email: 'heth@fpt.edu.vn', status: 'attended', registeredAt: '2025-03-03' },
    { name: 'Vũ Văn F', email: 'vuvf@fpt.edu.vn', status: 'registered', registeredAt: '2025-03-10' },
    { name: 'Đặng Thị G', email: 'dgtt@fpt.edu.vn', status: 'cancelled', registeredAt: '2025-03-08' }
  ],
  highlights: [
    buildFillRateHighlight(93),
    '124 đánh giá sau sự kiện, điểm TB 4.6/5.',
    '172/186 người đăng ký có mặt (check-in).'
  ]
});

module.exports = {
  DEMO_REPORT_EVENT_ID,
  buildDemoReportSummary,
  buildDemoReportDetail
};
