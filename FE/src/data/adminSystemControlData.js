/** Cấu hình & dữ liệu hiển thị — Kiểm soát hệ thống */

export const ADMIN_SYSTEM_TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'email', label: 'Email Server' },
  { id: 'payment', label: 'Payment Gateway' },
  { id: 'security', label: 'Bảo mật & API' },
];

export const ADMIN_SYSTEM_DEFAULT_CONFIG = {
  maintenanceMode: false,
  publicAnnouncements: true,
  maintenanceMessage: 'Hệ thống đang bảo trì định kỳ. Vui lòng quay lại sau.',
  email: {
    enabled: true,
    host: 'smtp.gmail.com',
    port: '587',
    encryption: 'TLS',
    fromName: 'F-Events',
    fromEmail: 'fevents@fpt.edu.vn',
    replyTo: 'support@fpt.edu.vn',
    dailyLimit: '500',
    timeoutSeconds: '12',
  },
  payment: {
    enabled: true,
    provider: 'vnpay',
    merchantId: 'FEVENTS01',
    sandbox: true,
    callbackUrl: 'http://localhost:5000/api/payment/callback',
    returnUrl: 'http://localhost:5173/payment/result',
    momoPartner: 'MOMO_FE_2024',
    currency: 'VND',
    minAmount: '10000',
    maxAmount: '50000000',
  },
  security: {
    jwtHours: '168',
    otpMinutes: '5',
    maxLoginAttempts: '5',
    lockoutMinutes: '15',
    forceHttps: false,
    auditLog: true,
    corsOrigins: 'http://localhost:5173',
    apiRateLimit: '120',
    passwordMinLength: '8',
    requireStrongPassword: true,
  },
};

export const ADMIN_SYSTEM_STATUS_CARDS = [
  {
    id: 'api',
    title: 'API Backend',
    status: 'online',
    statusLabel: 'Hoạt động',
    metric: '99.9%',
    metricLabel: 'uptime 30 ngày',
    detail: 'Express · port 5000',
  },
  {
    id: 'db',
    title: 'MongoDB',
    status: 'online',
    statusLabel: 'Kết nối ổn',
    metric: 'FEventsDB',
    metricLabel: 'database',
    detail: 'Atlas cluster · replica set',
  },
  {
    id: 'email',
    title: 'Email Server',
    status: 'online',
    statusLabel: 'Hoạt động',
    metric: '42ms',
    metricLabel: 'phản hồi SMTP',
    detail: 'Gmail SMTP · App Password',
  },
  {
    id: 'payment',
    title: 'Payment Gateway',
    status: 'online',
    statusLabel: 'Sandbox',
    metric: '0',
    metricLabel: 'lỗi 24h',
    detail: 'VNPay / MoMo · thử nghiệm',
  },
];

export const ADMIN_INFRA_SERVICES = [
  {
    id: 'fe',
    name: 'Frontend (Vite)',
    endpoint: 'http://localhost:5173',
    version: 'React 18 · Vite 5',
    status: 'online',
    statusLabel: 'Đang chạy',
    latency: '—',
    note: 'Giao diện người dùng & admin',
  },
  {
    id: 'be',
    name: 'Backend API',
    endpoint: 'http://localhost:5000',
    version: 'Node.js · Express 4',
    status: 'online',
    statusLabel: 'Đang chạy',
    latency: '~25ms',
    note: 'REST API · JWT auth',
  },
  {
    id: 'db',
    name: 'MongoDB Atlas',
    endpoint: 'FEventsDB',
    version: 'Mongoose 9',
    status: 'online',
    statusLabel: 'Đã kết nối',
    latency: '~80ms',
    note: 'Users, Events, Clubs, Proposals',
  },
  {
    id: 'smtp',
    name: 'SMTP (Gmail)',
    endpoint: 'smtp.gmail.com:587',
    version: 'Nodemailer 8',
    status: 'online',
    statusLabel: 'Đã cấu hình',
    latency: '42ms',
    note: 'OTP đăng ký · email kích hoạt tài khoản',
  },
];

export const ADMIN_PLATFORM_INFO = [
  { label: 'Phiên bản sản phẩm', value: 'F-Events v1.0 (SWP391)' },
  { label: 'Môi trường', value: 'Development (local)' },
  { label: 'JWT hết hạn', value: 'Theo cấu hình tab Bảo mật' },
  { label: 'CORS cho phép', value: 'http://localhost:5173' },
  { label: 'Lưu cấu hình', value: 'Trình duyệt (localStorage)' },
];

export const ADMIN_QUICK_METRICS = [
  { id: 'accounts', label: 'Tài khoản hệ thống', value: '—', hint: 'Tổng user trong DB' },
  { id: 'pending', label: 'Sự kiện chờ duyệt', value: '—', hint: 'status = pending' },
  { id: 'live', label: 'Sự kiện đang live', value: '—', hint: 'Đã publish' },
  { id: 'clubs', label: 'Câu lạc bộ', value: '—', hint: 'CLB active' },
];

export const ADMIN_ENV_DISPLAY = [
  { key: 'PORT', value: '5000', masked: false },
  { key: 'MONGO_URI', value: 'mongodb+srv://***@cluster/FEventsDB', masked: true },
  { key: 'JWT_SECRET', value: '••••••••••••', masked: true },
  { key: 'EMAIL_USER', value: 'nhatlink888@gmail.com', masked: false },
  { key: 'EMAIL_PASS', value: '••••••••••••••••', masked: true },
  { key: 'APP_URL', value: 'http://localhost:5173', masked: false },
  { key: 'GOOGLE_CLIENT_ID', value: '(chưa cấu hình)', masked: false },
];

export const ADMIN_SYSTEM_CHANGE_LOG = [
  { id: '1', minutesAgo: 12, actor: 'IT_Admin', action: 'Bật chế độ sandbox VNPay', tone: 'default' },
  { id: '2', minutesAgo: 45, actor: 'Admin_System', action: 'Cập nhật SMTP Relay port 587', tone: 'default' },
  { id: '3', minutesAgo: 120, actor: 'SYSTEM_ALERT', action: 'Cảnh báo OTP timeout < 3 phút', tone: 'danger' },
  { id: '4', minutesAgo: 240, actor: 'IT_Admin', action: 'Lưu cấu hình JWT 168h', tone: 'primary' },
  { id: '5', minutesAgo: 360, actor: 'Admin_System', action: 'Tắt chế độ bảo trì', tone: 'default' },
  { id: '6', minutesAgo: 480, actor: 'SYSTEM', action: 'Sao lưu snapshot MongoDB (mock)', tone: 'default' },
];

export const ENCRYPTION_OPTIONS = [
  { value: 'TLS', label: 'TLS' },
  { value: 'SSL', label: 'SSL' },
  { value: 'NONE', label: 'Không mã hóa' },
];

export const PAYMENT_PROVIDER_OPTIONS = [
  { value: 'vnpay', label: 'VNPay' },
  { value: 'momo', label: 'MoMo' },
  { value: 'both', label: 'VNPay + MoMo' },
];

export const CURRENCY_OPTIONS = [
  { value: 'VND', label: 'VND' },
  { value: 'USD', label: 'USD' },
];
