/** Cấu hình & dữ liệu hiển thị — Kiểm soát hệ thống */

export const ADMIN_SYSTEM_TABS = [
  { id: 'overview', labelKey: 'admin.system.tab.overview' },
  { id: 'email', labelKey: 'admin.system.tab.email' },
  { id: 'payment', labelKey: 'admin.system.tab.payment' },
  { id: 'security', labelKey: 'admin.system.tab.security' },
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
    enabled: false,
    provider: 'sepay',
    accountNumber: '',
    bankCode: '',
    accountHolder: '',
    webhookApiKey: '',
    webhookApiKeySet: false,
    expireMinutes: '15',
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
    titleKey: 'admin.system.status.api',
    status: 'online',
    statusLabelKey: 'admin.system.status.online',
    metric: '99.9%',
    metricLabelKey: 'admin.system.status.uptime30',
    detailKey: 'admin.system.status.apiDetail',
  },
  {
    id: 'db',
    titleKey: 'admin.system.status.db',
    status: 'online',
    statusLabelKey: 'admin.system.status.connected',
    metric: 'FEventsDB',
    metricLabelKey: 'admin.system.status.database',
    detailKey: 'admin.system.status.dbDetail',
  },
  {
    id: 'email',
    titleKey: 'admin.system.status.email',
    status: 'online',
    statusLabelKey: 'admin.system.status.online',
    metric: '42ms',
    metricLabelKey: 'admin.system.status.smtpResponse',
    detailKey: 'admin.system.status.emailDetail',
  },
  {
    id: 'payment',
    titleKey: 'admin.system.status.payment',
    status: 'online',
    statusLabelKey: 'admin.system.status.sandbox',
    metric: '0',
    metricLabelKey: 'admin.system.status.errors24h',
    detailKey: 'admin.system.status.paymentDetail',
  },
];

export const ADMIN_INFRA_SERVICES = [
  {
    id: 'fe',
    nameKey: 'admin.system.infra.fe',
    endpoint: 'http://localhost:5173',
    version: 'React 18 · Vite 5',
    status: 'online',
    statusLabelKey: 'admin.system.status.running',
    latency: '—',
    noteKey: 'admin.system.infra.feNote',
  },
  {
    id: 'be',
    nameKey: 'admin.system.infra.be',
    endpoint: 'http://localhost:5000',
    version: 'Node.js · Express 4',
    status: 'online',
    statusLabelKey: 'admin.system.status.running',
    latency: '~25ms',
    noteKey: 'admin.system.infra.beNote',
  },
  {
    id: 'db',
    nameKey: 'admin.system.infra.db',
    endpoint: 'FEventsDB',
    version: 'Mongoose 9',
    status: 'online',
    statusLabelKey: 'admin.system.status.configured',
    latency: '~80ms',
    noteKey: 'admin.system.infra.dbNote',
  },
  {
    id: 'smtp',
    nameKey: 'admin.system.infra.smtp',
    endpoint: 'smtp.gmail.com:587',
    version: 'Nodemailer 8',
    status: 'online',
    statusLabelKey: 'admin.system.status.configured',
    latency: '42ms',
    noteKey: 'admin.system.infra.smtpNote',
  },
];

export const ADMIN_PLATFORM_INFO = [
  { labelKey: 'admin.system.platform.version', value: 'F-Events v1.0 (SWP391)' },
  { labelKey: 'admin.system.platform.env', value: 'Development (local)' },
  { labelKey: 'admin.system.platform.jwt', valueKey: 'admin.system.platform.jwtValue' },
  { labelKey: 'admin.system.platform.cors', value: 'http://localhost:5173' },
  { labelKey: 'admin.system.platform.storage', valueKey: 'admin.system.platform.storageValue' },
];

export const ADMIN_QUICK_METRICS = [
  { id: 'accounts', labelKey: 'admin.system.metric.accounts', value: '—', hintKey: 'admin.system.metric.accountsHint' },
  { id: 'pending', labelKey: 'admin.system.metric.pending', value: '—', hintKey: 'admin.system.metric.pendingHint' },
  { id: 'live', labelKey: 'admin.system.metric.live', value: '—', hintKey: 'admin.system.metric.liveHint' },
  { id: 'clubs', labelKey: 'admin.system.metric.clubs', value: '—', hintKey: 'admin.system.metric.clubsHint' },
];

export const ADMIN_ENV_DISPLAY = [
  { key: 'PORT', value: '5000', masked: false },
  { key: 'MONGO_URI', value: 'mongodb+srv://***@cluster/FEventsDB', masked: true },
  { key: 'JWT_SECRET', value: '••••••••••••', masked: true },
  { key: 'EMAIL_USER', value: 'nhatlink888@gmail.com', masked: false },
  { key: 'EMAIL_PASS', value: '••••••••••••••••', masked: true },
  { key: 'APP_URL', value: 'http://localhost:5173', masked: false },
  { key: 'GOOGLE_CLIENT_ID', valueKey: 'admin.system.env.notConfigured', masked: false },
];

export const ADMIN_SYSTEM_CHANGE_LOG = [
  { id: '1', minutesAgo: 12, actor: 'IT_Admin', actionKey: 'admin.system.changelog.sandboxVnpay', tone: 'default' },
  { id: '2', minutesAgo: 45, actor: 'Admin_System', actionKey: 'admin.system.changelog.smtpPort', tone: 'default' },
  { id: '3', minutesAgo: 120, actor: 'SYSTEM_ALERT', actionKey: 'admin.system.changelog.otpAlert', tone: 'danger' },
  { id: '4', minutesAgo: 240, actor: 'IT_Admin', actionKey: 'admin.system.changelog.jwt168', tone: 'primary' },
  { id: '5', minutesAgo: 360, actor: 'Admin_System', actionKey: 'admin.system.changelog.maintenanceOff', tone: 'default' },
  { id: '6', minutesAgo: 480, actor: 'SYSTEM', actionKey: 'admin.system.changelog.dbBackup', tone: 'default' },
];

export const ENCRYPTION_OPTIONS = [
  { value: 'TLS', label: 'TLS' },
  { value: 'SSL', label: 'SSL' },
  { value: 'NONE', labelKey: 'admin.system.email.encryption.none' },
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
