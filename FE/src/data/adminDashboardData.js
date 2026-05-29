/** Mock data — Figma SWP391_2 node 37:2 Admin dashboard */

export const ADMIN_TRAFFIC_SPARKLINE = [14, 24, 19, 34, 29, 43];

export const ADMIN_TRAFFIC_OVERVIEW = {
  active: 1250,
  live: {
    pill: 'Live',
    title: 'Trực tuyến',
    hint: 'Theo dõi thời gian thực',
  },
  compare: {
    trend: '+8,2%',
    direction: 'up',
    label: 'Biến động',
    reference: 'So với cùng khung giờ hôm qua',
  },
  sparklineCaption: '6 giờ qua',
  peak: { value: 1840, time: '19:30' },
  metrics: [
    { id: 'sessions', label: 'Phiên hôm nay', value: '4,820' },
    { id: 'pageviews', label: 'Lượt xem trang', value: '28.4K' },
    { id: 'avg', label: 'TB / phiên', value: '5m 42s' },
  ],
  channels: [
    { id: 'web', label: 'Web', percent: 62 },
    { id: 'mobile', label: 'Mobile', percent: 38 },
  ],
};

export const ADMIN_REVENUE_OVERVIEW = {
  total: '120,000,000',
  currency: 'VNĐ',
  trend: '+15%',
  trendCaption: 'so với tháng trước',
  previousMonth: '104,350,000 VNĐ',
  goal: { current: 120, percent: 80, target: '150,000,000 VNĐ', label: 'Mục tiêu tháng 10' },
  metrics: [
    { id: 'tickets', label: 'Vé đã bán', value: '3,240' },
    { id: 'events', label: 'Sự kiện có doanh thu', value: '18' },
    { id: 'avg', label: 'Giá TB / vé', value: '37,037 VNĐ' },
  ],
  breakdown: [
    { id: 'online', label: 'Thanh toán online', amount: '98.2M', percent: 82 },
    { id: 'counter', label: 'Tại quầy CTSV', amount: '21.8M', percent: 18 },
  ],
};

/** Email & payment subsystem — monitoring card */
export const ADMIN_SYSTEM_OVERALL = {
  status: 'stable',
  label: 'ỔN ĐỊNH',
  uptime: '99.9%',
  uptimeCaption: 'uptime 30 ngày',
  lastCheck: 'Vừa xong · 12s trước',
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

export const ADMIN_MONTHLY_PERFORMANCE = [
  { label: 'T1', value: 34, month: 'Tháng 1' },
  { label: 'T2', value: 51, month: 'Tháng 2' },
  { label: 'T3', value: 26, month: 'Tháng 3' },
  { label: 'T4', value: 68, month: 'Tháng 4' },
  { label: 'T5', value: 42, month: 'Tháng 5' },
  { label: 'T6', value: 76, month: 'Tháng 6' },
];

export const ADMIN_CHART_SUMMARY = {
  period: '6 tháng gần nhất',
  avg: 49.5,
  peak: { label: 'T6', value: 76, month: 'Tháng 6' },
  growth: '+12.4%',
  growthCaption: 'T6 so với T5',
};

/** Bảng chi tiết — modal lưu lượng */
export const ADMIN_TRAFFIC_DETAIL = {
  title: 'Chi tiết lưu lượng truy cập',
  subtitle: 'Theo dõi theo khung giờ · Hôm nay 24/10/2024',
  summary: [
    { label: 'Đang trực tuyến', value: '1.250' },
    { label: 'Phiên hôm nay', value: '4.820' },
    { label: 'Đỉnh trong ngày', value: '1.840 (19:30)' },
  ],
  columns: ['Khung giờ', 'Trực tuyến', 'Phiên mới', 'Lượt xem', 'TB / phiên', 'So với hôm qua'],
  rows: [
    { id: '1', time: '14:00 – 15:00', online: 1250, sessions: 412, views: '4.2K', avg: '5m 38s', delta: '+8,2%', deltaTone: 'up' },
    { id: '2', time: '13:00 – 14:00', online: 1180, sessions: 385, views: '3.9K', avg: '5m 12s', delta: '+5,1%', deltaTone: 'up' },
    { id: '3', time: '12:00 – 13:00', online: 1090, sessions: 360, views: '3.5K', avg: '4m 58s', delta: '+2,4%', deltaTone: 'up' },
    { id: '4', time: '11:00 – 12:00', online: 980, sessions: 320, views: '3.1K', avg: '5m 05s', delta: '-1,2%', deltaTone: 'down' },
    { id: '5', time: '10:00 – 11:00', online: 920, sessions: 298, views: '2.8K', avg: '4m 44s', delta: '+3,8%', deltaTone: 'up' },
    { id: '6', time: '09:00 – 10:00', online: 840, sessions: 275, views: '2.5K', avg: '4m 30s', delta: '+6,0%', deltaTone: 'up' },
    { id: '7', time: '08:00 – 09:00', online: 720, sessions: 240, views: '2.1K', avg: '4m 22s', delta: '-0,5%', deltaTone: 'down' },
    { id: '8', time: '19:00 – 20:00 (đỉnh)', online: 1840, sessions: 520, views: '6.1K', avg: '6m 10s', delta: '+14,3%', deltaTone: 'up', highlight: true },
  ],
};

/** Bảng chi tiết — modal doanh thu */
export const ADMIN_REVENUE_DETAIL = {
  title: 'Chi tiết doanh thu bán vé',
  subtitle: 'Tháng 10/2024 · Toàn sàn F-Events',
  summary: [
    { label: 'Tổng doanh thu', value: '120.000.000 VNĐ' },
    { label: 'Vé đã bán', value: '3.240' },
    { label: 'Mục tiêu tháng', value: '80%' },
  ],
  columns: ['Sự kiện', 'CLB / Đơn vị', 'Vé bán', 'Doanh thu', 'Kênh', 'Trạng thái'],
  rows: [
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

/** Bảng chi tiết — modal hiệu suất tháng */
export const ADMIN_PERFORMANCE_DETAIL = {
  title: 'Chi tiết hiệu suất vận hành',
  subtitle: '6 tháng gần nhất · Chỉ số tổng hợp (%)',
  summary: [
    { label: 'Trung bình', value: '49,5%' },
    { label: 'Cao nhất', value: 'T6 · 76%' },
    { label: 'Tăng trưởng T6/T5', value: '+12,4%' },
  ],
  columns: ['Tháng', 'Hiệu suất', 'Sự kiện active', 'Phiên xử lý', 'CPU trung bình', 'Ghi chú'],
  rows: [
    { id: '1', month: 'Tháng 1 (T1)', score: '34%', events: 8, sessions: '12.4K', cpu: '41%', note: 'Khởi động hệ thống' },
    { id: '2', month: 'Tháng 2 (T2)', score: '51%', events: 11, sessions: '18.2K', cpu: '48%', note: 'Tăng sau Tết' },
    { id: '3', month: 'Tháng 3 (T3)', score: '26%', events: 6, sessions: '9.1K', cpu: '52%', note: 'Bảo trì định kỳ' },
    { id: '4', month: 'Tháng 4 (T4)', score: '68%', events: 14, sessions: '24.6K', cpu: '55%', note: 'Mùa sự kiện lớn' },
    { id: '5', month: 'Tháng 5 (T5)', score: '42%', events: 10, sessions: '16.8K', cpu: '49%', note: 'Ổn định trung bình' },
    { id: '6', month: 'Tháng 6 (T6)', score: '76%', events: 18, sessions: '31.2K', cpu: '58%', note: 'Cao nhất · TechDay', highlight: true },
  ],
};

export const ADMIN_METRIC_DETAIL_MAP = {
  traffic: ADMIN_TRAFFIC_DETAIL,
  revenue: ADMIN_REVENUE_DETAIL,
  performance: ADMIN_PERFORMANCE_DETAIL,
};

export const ADMIN_ACTIVITY_LOGS = [
  {
    id: '1',
    time: '10:45 AM, 24/10/2024',
    actor: 'CTSV_01',
    message: 'Phê duyệt sự kiện "FPT TechDay 2024"',
    tone: 'primary',
  },
  {
    id: '2',
    time: '09:30 AM, 24/10/2024',
    actor: 'Admin_System',
    message: 'Cập nhật cấu hình Payment Gateway',
    tone: 'default',
  },
  {
    id: '3',
    time: '08:15 AM, 24/10/2024',
    actor: 'SYSTEM_ALERT',
    message: 'Cảnh báo tải CPU > 80% tại node-02',
    tone: 'danger',
  },
  {
    id: '4',
    time: '07:50 AM, 24/10/2024',
    actor: 'CLB_FPT_AI',
    message: 'Tạo chiến dịch truyền thông mới',
    tone: 'default',
  },
  {
    id: '5',
    time: '06:20 AM, 24/10/2024',
    actor: 'CTSV_02',
    message: 'Từ chối đề xuất sự kiện "Workshop AI cơ bản"',
    tone: 'primary',
  },
  {
    id: '6',
    time: '11:30 PM, 23/10/2024',
    actor: 'Admin_System',
    message: 'Sao lưu cơ sở dữ liệu lõi thành công',
    tone: 'default',
  },
  {
    id: '7',
    time: '09:10 PM, 23/10/2024',
    actor: 'SYSTEM_ALERT',
    message: 'Phát hiện đăng nhập bất thường từ IP lạ',
    tone: 'danger',
  },
  {
    id: '8',
    time: '04:55 PM, 23/10/2024',
    actor: 'IT_Admin',
    message: 'Cấp quyền admin cho tài khoản nhatlink888@gmail.com',
    tone: 'primary',
  },
  {
    id: '9',
    time: '02:15 PM, 23/10/2024',
    actor: 'CTSV_01',
    message: 'Phê duyệt sự kiện "F-Fest 2026"',
    tone: 'primary',
  },
  {
    id: '10',
    time: '10:00 AM, 23/10/2024',
    actor: 'CLB_FPT_BASKETBALL',
    message: 'Gửi đề xuất sự kiện giải bóng rổ nội bộ',
    tone: 'default',
  },
];

/** Số dòng hiển thị trên dashboard (panel nhỏ) */
export const ADMIN_ACTIVITY_PREVIEW_COUNT = 4;
