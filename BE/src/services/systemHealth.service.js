const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Club = require('../models/Club');
const { PORT, APP_URL, CLIENT_ORIGIN, GOOGLE_CLIENT_ID } = require('../config/env');
const { verifySmtpConnection } = require('./email.service');
const { getPaymentSettings } = require('./systemSettings.service');

const SERVER_BOOT = Date.now();

const maskSecret = (value, visible = 0) => {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  if (visible > 0 && raw.length > visible) {
    return `${raw.slice(0, visible)}${'*'.repeat(Math.min(8, raw.length - visible))}`;
  }
  return '••••••••••••';
};

const maskMongoUri = (uri) => {
  const raw = String(uri || '').trim();
  if (!raw) return '—';
  return raw.replace(/\/\/([^:@/]+):([^@/]+)@/, '//***:***@');
};

const formatUptime = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const pingDatabase = async () => {
  const conn = mongoose.connection;
  const readyState = conn.readyState;
  if (readyState !== 1) {
    return {
      status: readyState === 2 ? 'degraded' : 'offline',
      latencyMs: null,
      name: conn.name || '—',
      host: conn.host || '—',
      detail: `readyState=${readyState}`,
    };
  }

  const started = Date.now();
  try {
    await conn.db.admin().ping();
    return {
      status: 'online',
      latencyMs: Date.now() - started,
      name: conn.name || 'FEventsDB',
      host: conn.host || '—',
      detail: conn.host?.includes('mongodb.net') ? 'Atlas cluster' : 'MongoDB',
    };
  } catch (err) {
    return {
      status: 'offline',
      latencyMs: null,
      name: conn.name || '—',
      host: conn.host || '—',
      detail: err.message || 'Ping failed',
    };
  }
};

const getPaymentStatus = async () => {
  const payment = await getPaymentSettings();
  const hasAccount = Boolean(payment.accountNumber && payment.bankCode);
  const hasWebhook = Boolean(payment.webhookApiKey);
  const enabled = Boolean(payment.enabled);

  if (!enabled) {
    return {
      status: 'degraded',
      mode: 'disabled',
      configured: false,
      errors24h: null,
      detail: 'SePay chưa bật — vào tab Thanh toán nếu cần vé trả phí',
    };
  }

  if (!hasAccount) {
    return {
      status: 'degraded',
      mode: 'disabled',
      configured: false,
      errors24h: null,
      detail: 'SePay đã bật nhưng thiếu số tài khoản hoặc mã ngân hàng',
    };
  }

  return {
    status: 'online',
    mode: 'production',
    configured: true,
    errors24h: null,
    detail: hasWebhook
      ? `SePay · ${payment.bankCode} · ${payment.accountNumber}`
      : `SePay · ${payment.bankCode} · ${payment.accountNumber} · nên thêm webhook API key (bảo mật)`,
  };
};

const buildEnvDisplay = () => {
  const entries = [
    { key: 'PORT', value: String(PORT || process.env.PORT || 5000), masked: false },
    { key: 'MONGO_URI', value: maskMongoUri(process.env.MONGO_URI), masked: true },
    { key: 'JWT_SECRET', value: maskSecret(process.env.JWT_SECRET), masked: true },
    { key: 'EMAIL_USER', value: process.env.EMAIL_USER || '—', masked: false },
    { key: 'EMAIL_PASS', value: maskSecret(process.env.EMAIL_PASS), masked: true },
    { key: 'APP_URL', value: APP_URL || '—', masked: false },
    {
      key: 'GOOGLE_CLIENT_ID',
      value:
        GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'mock'
          ? maskSecret(GOOGLE_CLIENT_ID, 6)
          : '—',
      masked: GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'mock',
    },
  ];
  return entries;
};

const getSystemHealth = async () => {
  const checkedAt = new Date();
  const uptimeSeconds = process.uptime();

  // Đếm số liệu không được làm sập endpoint: nếu DB rớt, các count vẫn trả null thay vì reject.
  const safeCount = (query) => Promise.resolve(query).then((n) => n).catch(() => null);
  const [dbHealth, smtpHealth, accounts, pendingEvents, liveEvents, clubs] = await Promise.all([
    pingDatabase(),
    verifySmtpConnection().catch(() => ({ status: 'offline', latencyMs: null, detail: 'SMTP check failed' })),
    safeCount(User.countDocuments()),
    safeCount(
      Event.countDocuments({
        status: { $in: ['pending', 'pending_ctsv', 'pending_icpdp', 'pending_admin', 'revision'] },
        isHidden: { $ne: true },
      }),
    ),
    safeCount(Event.countDocuments({ status: 'live', isHidden: { $ne: true } })),
    safeCount(Club.countDocuments()),
  ]);

  const payment = await getPaymentStatus().catch(() => ({
    status: 'degraded',
    mode: 'unknown',
    configured: false,
    errors24h: null,
    detail: 'Không đọc được cấu hình thanh toán (DB?)',
  }));
  const apiLatencyMs = 0;

  const serviceStatuses = [dbHealth.status, smtpHealth.status];
  const overallStatus = serviceStatuses.every((s) => s === 'online')
    ? 'stable'
    : serviceStatuses.some((s) => s === 'offline')
      ? 'offline'
      : 'degraded';

  const nodeVersion = process.version;
  const emailHost = smtpHealth.host || 'smtp.gmail.com:587';

  return {
    checkedAt: checkedAt.toISOString(),
    bootedAt: new Date(SERVER_BOOT).toISOString(),
    overall: {
      status: overallStatus,
      uptimeSeconds,
      uptimeFormatted: formatUptime(uptimeSeconds),
    },
    metrics: {
      accounts,
      pendingEvents,
      liveEvents,
      clubs,
    },
    services: {
      api: {
        status: 'online',
        latencyMs: apiLatencyMs,
        port: Number(PORT) || 5000,
        framework: `Express 4 · Node ${nodeVersion}`,
        uptimeSeconds,
        detail: `Port ${PORT || 5000}`,
      },
      db: dbHealth,
      email: smtpHealth,
      payment,
    },
    infra: [
      {
        id: 'fe',
        endpoint: APP_URL || CLIENT_ORIGIN || 'http://localhost:5173',
        version: 'React 19 · Vite 8',
        status: 'online',
        latencyMs: null,
        note: 'Giao diện người dùng & admin',
      },
      {
        id: 'be',
        endpoint: `http://localhost:${PORT || 5000}`,
        version: `Node ${nodeVersion} · Express 4`,
        status: 'online',
        latencyMs: apiLatencyMs,
        note: 'REST API · JWT auth',
      },
      {
        id: 'db',
        endpoint: dbHealth.name,
        version: 'Mongoose 9',
        status: dbHealth.status,
        latencyMs: dbHealth.latencyMs,
        note: dbHealth.detail,
      },
      {
        id: 'smtp',
        endpoint: emailHost,
        version: 'Nodemailer 8',
        status: smtpHealth.status,
        latencyMs: smtpHealth.latencyMs,
        note: smtpHealth.detail,
      },
    ],
    platform: {
      version: 'F-Events v1.0 (SWP391)',
      environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Development (local)',
      cors: CLIENT_ORIGIN || APP_URL || 'http://localhost:5173',
      nodeVersion,
    },
    env: buildEnvDisplay(),
  };
};

module.exports = { getSystemHealth, formatUptime };
