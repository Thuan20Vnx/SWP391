/** Mock templates — thời gian được gắn theo thời gian thực trong adminDashboardLive.js */

export const ADMIN_TRAFFIC_SPARKLINE = [14, 24, 19, 34, 29, 43];

/** 8 khung giờ (cũ → mới); giờ hiển thị tính từ thời điểm hiện tại */
export const ADMIN_TRAFFIC_HOURLY_PATTERN = [
  { online: 720, sessions: 240, views: '2.1K', avg: '4m 22s', delta: '-0,5%', deltaTone: 'down' },
  { online: 840, sessions: 275, views: '2.5K', avg: '4m 30s', delta: '+6,0%', deltaTone: 'up' },
  { online: 920, sessions: 298, views: '2.8K', avg: '4m 44s', delta: '+3,8%', deltaTone: 'up' },
  { online: 980, sessions: 320, views: '3.1K', avg: '5m 05s', delta: '-1,2%', deltaTone: 'down' },
  { online: 1090, sessions: 360, views: '3.5K', avg: '4m 58s', delta: '+2,4%', deltaTone: 'up' },
  { online: 1180, sessions: 385, views: '3.9K', avg: '5m 12s', delta: '+5,1%', deltaTone: 'up' },
  { online: 1840, sessions: 520, views: '6.1K', avg: '6m 10s', delta: '+14,3%', deltaTone: 'up' },
  { online: 1250, sessions: 412, views: '4.2K', avg: '5m 38s', delta: '+8,2%', deltaTone: 'up' },
];

export const ADMIN_MONTHLY_VALUES = [34, 51, 26, 68, 42, 76];

export const ADMIN_REVENUE_OVERVIEW_STATIC = {
  overview: {
    total: '120,000,000',
    currency: 'VNĐ',
    trend: '+15%',
    trendCaption: 'so với tháng trước',
    previousMonth: '104,350,000 VNĐ',
    goal: { current: 120, percent: 80, target: '150,000,000 VNĐ' },
    metrics: [
      { id: 'tickets', label: 'Vé đã bán', value: '3,240' },
      { id: 'events', label: 'Sự kiện có doanh thu', value: '18' },
      { id: 'avg', label: 'Giá TB / vé', value: '37,037 VNĐ' },
    ],
    breakdown: [
      { id: 'online', label: 'Thanh toán online', amount: '98.2M', percent: 82 },
      { id: 'counter', label: 'Tại quầy CTSV', amount: '21.8M', percent: 18 },
    ],
  },
  detailSummary: [
    { label: 'Tổng doanh thu', value: '120.000.000 VNĐ' },
    { label: 'Vé đã bán', value: '3.240' },
    { label: 'Mục tiêu tháng', value: '80%' },
  ],
  detailRows: [
    { id: '1', event: 'FPT TechDay 2024', org: 'FPT Event Hub', tickets: 820, revenue: '32.800.000 VNĐ', channel: 'Online', status: 'Đang diễn ra', statusTone: 'active' },
    { id: '2', event: 'F-Fest 2026', org: 'CLB FPT Music', tickets: 540, revenue: '21.600.000 VNĐ', channel: 'Online', status: 'Mở bán', statusTone: 'active' },
    { id: '3', event: 'Workshop AI cơ bản', org: 'CLB FPT AI', tickets: 310, revenue: '9.300.000 VNĐ', channel: 'Tại quầy', status: 'Đã kết thúc', statusTone: 'done' },
    { id: '4', event: 'Giải bóng rổ nội bộ', org: 'CLB Basketball', tickets: 280, revenue: '8.400.000 VNĐ', channel: 'Online', status: 'Mở bán', statusTone: 'active' },
    { id: '5', event: 'Career Fair 2024', org: 'CTSV', tickets: 420, revenue: '16.800.000 VNĐ', channel: 'Hỗn hợp', status: 'Đang diễn ra', statusTone: 'active' },
    { id: '6', event: 'Hackathon FPT 2024', org: 'CLB Dev', tickets: 190, revenue: '7.600.000 VNĐ', channel: 'Online', status: 'Sắp diễn ra', statusTone: 'pending' },
    { id: '7', event: 'Gala FPT 2024', org: 'Ban tổ chức', tickets: 150, revenue: '12.000.000 VNĐ', channel: 'Tại quầy', status: 'Đã kết thúc', statusTone: 'done' },
    { id: '8', event: 'Seminar Blockchain', org: 'CLB Fintech', tickets: 95, revenue: '2.850.000 VNĐ', channel: 'Online', status: 'Đã kết thúc', statusTone: 'done' },
  ],
};

export const ADMIN_SYSTEM_SERVICES = [
  {
    id: 'email',
    name: 'Email Server',
    provider: 'SMTP Relay',
    metric: '42ms',
    metricLabel: 'phản hồi',
    status: 'online',
    statusLabel: 'Hoạt động',
  },
  {
    id: 'payment',
    name: 'Payment Gateway',
    provider: 'VNPay / MoMo',
    metric: '0',
    metricLabel: 'lỗi 24h',
    status: 'online',
    statusLabel: 'Hoạt động',
  },
];

/** minutesAgo: khoảng thời gian trước thời điểm hiện tại */
export const ADMIN_ACTIVITY_LOG_TEMPLATES = [
  { id: '1', minutesAgo: 8, actor: 'CTSV_01', message: 'Phê duyệt sự kiện "FPT TechDay 2024"', tone: 'primary' },
  { id: '2', minutesAgo: 42, actor: 'Admin_System', message: 'Cập nhật cấu hình Payment Gateway', tone: 'default' },
  { id: '3', minutesAgo: 95, actor: 'SYSTEM_ALERT', message: 'Cảnh báo tải CPU > 80% tại node-02', tone: 'danger' },
  { id: '4', minutesAgo: 130, actor: 'CLB_FPT_AI', message: 'Tạo chiến dịch truyền thông mới', tone: 'default' },
  { id: '5', minutesAgo: 185, actor: 'CTSV_02', message: 'Từ chối đề xuất sự kiện "Workshop AI cơ bản"', tone: 'primary' },
  { id: '6', minutesAgo: 320, actor: 'Admin_System', message: 'Sao lưu cơ sở dữ liệu lõi thành công', tone: 'default' },
  { id: '7', minutesAgo: 480, actor: 'SYSTEM_ALERT', message: 'Phát hiện đăng nhập bất thường từ IP lạ', tone: 'danger' },
  { id: '8', minutesAgo: 720, actor: 'IT_Admin', message: 'Cấp quyền admin cho tài khoản nhatlink888@gmail.com', tone: 'primary' },
  { id: '9', minutesAgo: 900, actor: 'CTSV_01', message: 'Phê duyệt sự kiện "F-Fest 2026"', tone: 'primary' },
  { id: '10', minutesAgo: 1440, actor: 'CLB_FPT_BASKETBALL', message: 'Gửi đề xuất sự kiện giải bóng rổ nội bộ', tone: 'default' },
];

export const ADMIN_ACTIVITY_PREVIEW_COUNT = 4;
