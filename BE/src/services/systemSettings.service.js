const SystemSettings = require('../models/SystemSettings');
const AppError = require('../utils/AppError');
const { normalizeRole } = require('../utils/role');
const { writeAuditLog } = require('./auditLog.service');
const { MAINTENANCE_GRACE_SEC } = require('../constants/maintenance');

const GLOBAL_ID = SystemSettings.GLOBAL_ID;

const SETTINGS_UPDATE_OPTIONS = {
  new: true,
  upsert: true,
  runValidators: true,
  validateModifiedOnly: true,
  setDefaultsOnInsert: true,
};

const settingsUpsertUpdate = (patch) => ({
  $set: patch,
  $setOnInsert: { _id: GLOBAL_ID },
});

const DEFAULTS = {
  maintenanceMode: false,
  publicAnnouncements: true,
  maintenanceMessage: 'Hệ thống đang bảo trì định kỳ. Vui lòng quay lại sau.',
};

const EMAIL_DEFAULTS = {
  enabled: true,
  host: 'smtp.gmail.com',
  port: 587,
  encryption: 'TLS',
  fromName: 'F-Events',
  fromEmail: '',
  replyTo: '',
  dailyLimit: 500,
  timeoutSeconds: 12,
};

const PAYMENT_DEFAULTS = {
  enabled: false,
  provider: 'sepay',
  accountNumber: '',
  bankCode: '',
  accountHolder: '',
  webhookApiKey: '',
  expireMinutes: 15,
};

const SECURITY_DEFAULTS = {
  jwtHours: 168,
  otpMinutes: 5,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  forceHttps: false,
  auditLog: true,
  corsOrigins: 'http://localhost:5173',
  apiRateLimit: 120,
  passwordMinLength: 8,
  requireStrongPassword: true,
};

const STAFF_ROLES_DURING_MAINTENANCE = new Set(['admin', 'ctsv', 'icpdp']);

let cache = null;
let cacheAt = 0;
const CACHE_MS = 5000;

const toPublic = (doc) => ({
  maintenanceMode: Boolean(doc?.maintenanceMode),
  publicAnnouncements: doc?.publicAnnouncements !== false,
  maintenanceMessage: String(doc?.maintenanceMessage || DEFAULTS.maintenanceMessage).trim(),
  maintenanceActivatedAt: doc?.maintenanceActivatedAt || null,
  maintenanceGraceSeconds: MAINTENANCE_GRACE_SEC,
  updatedAt: doc?.updatedAt || null,
});

const toEmailPublic = (doc) => {
  const e = doc?.email || {};
  return {
    enabled: e.enabled !== false,
    host: e.host || EMAIL_DEFAULTS.host,
    port: String(e.port ?? EMAIL_DEFAULTS.port),
    encryption: e.encryption || EMAIL_DEFAULTS.encryption,
    fromName: e.fromName || EMAIL_DEFAULTS.fromName,
    fromEmail: e.fromEmail || '',
    replyTo: e.replyTo || '',
    dailyLimit: String(e.dailyLimit ?? EMAIL_DEFAULTS.dailyLimit),
    timeoutSeconds: String(e.timeoutSeconds ?? EMAIL_DEFAULTS.timeoutSeconds),
  };
};

const toPaymentPublic = (doc) => {
  const p = doc?.payment || {};
  return {
    enabled: Boolean(p.enabled),
    provider: p.provider || PAYMENT_DEFAULTS.provider,
    accountNumber: p.accountNumber || '',
    bankCode: p.bankCode || '',
    accountHolder: p.accountHolder || '',
    // KHÔNG trả khóa thật — chỉ báo đã cấu hình hay chưa
    webhookApiKeySet: Boolean(p.webhookApiKey),
    expireMinutes: String(p.expireMinutes ?? PAYMENT_DEFAULTS.expireMinutes),
  };
};

const toSecurityPublic = (doc) => {
  const s = doc?.security || {};
  return {
    jwtHours: String(s.jwtHours ?? SECURITY_DEFAULTS.jwtHours),
    otpMinutes: String(s.otpMinutes ?? SECURITY_DEFAULTS.otpMinutes),
    maxLoginAttempts: String(s.maxLoginAttempts ?? SECURITY_DEFAULTS.maxLoginAttempts),
    lockoutMinutes: String(s.lockoutMinutes ?? SECURITY_DEFAULTS.lockoutMinutes),
    forceHttps: Boolean(s.forceHttps),
    auditLog: s.auditLog !== false,
    corsOrigins: s.corsOrigins || SECURITY_DEFAULTS.corsOrigins,
    apiRateLimit: String(s.apiRateLimit ?? SECURITY_DEFAULTS.apiRateLimit),
    passwordMinLength: String(s.passwordMinLength ?? SECURITY_DEFAULTS.passwordMinLength),
    requireStrongPassword: s.requireStrongPassword !== false,
  };
};

const getSettings = async (useCache = true) => {
  const now = Date.now();
  if (useCache && cache && now - cacheAt < CACHE_MS) {
    return cache;
  }
  let doc = await SystemSettings.findById(GLOBAL_ID).lean();
  if (!doc) {
    doc = (
      await SystemSettings.create({
        _id: GLOBAL_ID,
        ...DEFAULTS,
        email: EMAIL_DEFAULTS,
        payment: PAYMENT_DEFAULTS,
        security: SECURITY_DEFAULTS,
      })
    ).toObject();
  }
  cache = doc;
  cacheAt = now;
  return doc;
};

const invalidateCache = () => {
  cache = null;
  cacheAt = 0;
};

const getPublicStatus = async () => toPublic(await getSettings());

const getEmailSettings = async () => {
  const doc = await getSettings();
  return { ...EMAIL_DEFAULTS, ...(doc.email || {}) };
};

const getSecuritySettings = async () => {
  const doc = await getSettings();
  return { ...SECURITY_DEFAULTS, ...(doc.security || {}) };
};

const getPaymentSettings = async () => {
  const doc = await getSettings();
  return { ...PAYMENT_DEFAULTS, ...(doc.payment || {}) };
};

const getEmailPublic = async () => toEmailPublic(await getSettings());
const getSecurityPublic = async () => toSecurityPublic(await getSettings());
const getPaymentPublic = async () => toPaymentPublic(await getSettings());

const isStaffRole = (role) => STAFF_ROLES_DURING_MAINTENANCE.has(normalizeRole(role));

const assertLoginAllowed = async (user) => {
  const settings = await getSettings();
  if (!settings.maintenanceMode) return;
  const { shouldEnforceMaintenance } = require('../constants/maintenance');
  if (!shouldEnforceMaintenance(settings)) return;
  if (!user || !isStaffRole(user.role)) {
    const err = new AppError(
      settings.maintenanceMessage || DEFAULTS.maintenanceMessage,
      503,
    );
    err.extra = { code: 'MAINTENANCE' };
    throw err;
  }
};

const auditIfEnabled = async (doc, payload) => {
  if (doc?.security?.auditLog === false) return;
  await writeAuditLog(payload);
};

const updateMaintenanceSettings = async (payload, actorEmail = '') => {
  const patch = {};
  const changes = [];
  if (typeof payload.maintenanceMode === 'boolean') {
    patch.maintenanceMode = payload.maintenanceMode;
    if (payload.maintenanceMode) {
      patch.maintenanceActivatedAt = new Date();
    } else {
      patch.maintenanceActivatedAt = null;
    }
    changes.push(payload.maintenanceMode ? 'bật chế độ bảo trì' : 'tắt chế độ bảo trì');
  }
  if (typeof payload.publicAnnouncements === 'boolean') {
    patch.publicAnnouncements = payload.publicAnnouncements;
    changes.push(payload.publicAnnouncements ? 'bật banner thông báo' : 'tắt banner thông báo');
  }
  if (payload.maintenanceMessage !== undefined) {
    patch.maintenanceMessage = String(payload.maintenanceMessage || '').trim()
      || DEFAULTS.maintenanceMessage;
  }
  if (Object.keys(patch).length === 0) {
    return toPublic(await getSettings(false));
  }
  patch.updatedBy = actorEmail || '';

  const doc = await SystemSettings.findByIdAndUpdate(
    GLOBAL_ID,
    settingsUpsertUpdate(patch),
    SETTINGS_UPDATE_OPTIONS,
  ).lean();

  invalidateCache();
  await auditIfEnabled(doc, {
    actorEmail,
    action: changes.length ? `Cập nhật bảo trì: ${changes.join(', ')}` : 'Cập nhật nội dung banner bảo trì',
    category: 'maintenance',
    tone: patch.maintenanceMode ? 'danger' : 'default',
  });
  return toPublic(doc);
};

const ALLOWED_ENCRYPTION = new Set(['TLS', 'SSL', 'NONE']);

const updateEmailSettings = async (payload = {}, actorEmail = '') => {
  const patch = {};
  if (typeof payload.enabled === 'boolean') patch['email.enabled'] = payload.enabled;
  if (payload.host !== undefined) patch['email.host'] = String(payload.host || '').trim();
  if (payload.port !== undefined) {
    const port = Number(payload.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new AppError('Cổng SMTP không hợp lệ (1–65535).', 400);
    }
    patch['email.port'] = port;
  }
  if (payload.encryption !== undefined) {
    const enc = String(payload.encryption || '').toUpperCase();
    if (!ALLOWED_ENCRYPTION.has(enc)) {
      throw new AppError('Kiểu mã hóa không hợp lệ.', 400);
    }
    patch['email.encryption'] = enc;
  }
  if (payload.fromName !== undefined) patch['email.fromName'] = String(payload.fromName || '').trim();
  if (payload.fromEmail !== undefined) patch['email.fromEmail'] = String(payload.fromEmail || '').trim();
  if (payload.replyTo !== undefined) patch['email.replyTo'] = String(payload.replyTo || '').trim();
  if (payload.dailyLimit !== undefined) patch['email.dailyLimit'] = Math.max(1, Number(payload.dailyLimit) || EMAIL_DEFAULTS.dailyLimit);
  if (payload.timeoutSeconds !== undefined) patch['email.timeoutSeconds'] = Math.max(5, Number(payload.timeoutSeconds) || EMAIL_DEFAULTS.timeoutSeconds);

  if (Object.keys(patch).length === 0) {
    return toEmailPublic(await getSettings(false));
  }
  patch.updatedBy = actorEmail || '';

  const doc = await SystemSettings.findByIdAndUpdate(
    GLOBAL_ID,
    settingsUpsertUpdate(patch),
    SETTINGS_UPDATE_OPTIONS,
  ).lean();

  invalidateCache();
  await auditIfEnabled(doc, {
    actorEmail,
    action: 'Cập nhật cấu hình Email/SMTP',
    category: 'email',
    tone: 'primary',
    detail: `${doc.email?.host || EMAIL_DEFAULTS.host}:${doc.email?.port || EMAIL_DEFAULTS.port} (${doc.email?.encryption || EMAIL_DEFAULTS.encryption})`,
  });
  return toEmailPublic(doc);
};

const updateSecuritySettings = async (payload = {}, actorEmail = '') => {
  const patch = {};
  const numericFields = {
    jwtHours: [1, 8760],
    otpMinutes: [1, 60],
    maxLoginAttempts: [1, 20],
    lockoutMinutes: [1, 1440],
    apiRateLimit: [10, 100000],
    passwordMinLength: [6, 64],
  };
  for (const [key, [min, max]] of Object.entries(numericFields)) {
    if (payload[key] !== undefined) {
      const val = Number(payload[key]);
      if (!Number.isFinite(val) || val < min || val > max) {
        throw new AppError(`Giá trị "${key}" phải nằm trong khoảng ${min}–${max}.`, 400);
      }
      patch[`security.${key}`] = Math.round(val);
    }
  }
  ['forceHttps', 'auditLog', 'requireStrongPassword'].forEach((key) => {
    if (typeof payload[key] === 'boolean') patch[`security.${key}`] = payload[key];
  });
  if (payload.corsOrigins !== undefined) {
    patch['security.corsOrigins'] = String(payload.corsOrigins || '').trim();
  }

  if (Object.keys(patch).length === 0) {
    return toSecurityPublic(await getSettings(false));
  }
  patch.updatedBy = actorEmail || '';

  const doc = await SystemSettings.findByIdAndUpdate(
    GLOBAL_ID,
    settingsUpsertUpdate(patch),
    SETTINGS_UPDATE_OPTIONS,
  ).lean();

  invalidateCache();
  await auditIfEnabled(doc, {
    actorEmail,
    action: 'Cập nhật chính sách bảo mật',
    category: 'security',
    tone: 'primary',
    detail: `mật khẩu tối thiểu ${doc.security?.passwordMinLength}, khóa sau ${doc.security?.maxLoginAttempts} lần`,
  });
  return toSecurityPublic(doc);
};

const updatePaymentSettings = async (payload = {}, actorEmail = '') => {
  const patch = {};
  if (typeof payload.enabled === 'boolean') patch['payment.enabled'] = payload.enabled;
  if (payload.provider !== undefined) patch['payment.provider'] = String(payload.provider || 'sepay').trim();
  if (payload.accountNumber !== undefined) patch['payment.accountNumber'] = String(payload.accountNumber || '').trim();
  if (payload.bankCode !== undefined) patch['payment.bankCode'] = String(payload.bankCode || '').trim();
  if (payload.accountHolder !== undefined) patch['payment.accountHolder'] = String(payload.accountHolder || '').trim();
  // Chỉ cập nhật khóa khi gửi giá trị mới không rỗng (giữ khóa cũ nếu để trống)
  if (payload.webhookApiKey !== undefined && String(payload.webhookApiKey).trim() !== '') {
    patch['payment.webhookApiKey'] = String(payload.webhookApiKey).trim();
  }
  if (payload.expireMinutes !== undefined) {
    const m = Number(payload.expireMinutes);
    if (!Number.isFinite(m) || m < 1 || m > 1440) {
      throw new AppError('Thời hạn đơn thanh toán phải trong khoảng 1–1440 phút.', 400);
    }
    patch['payment.expireMinutes'] = Math.round(m);
  }

  // Nếu bật thanh toán, bắt buộc có số TK + mã NH
  if (payload.enabled === true) {
    const current = await getPaymentSettings();
    const acc = patch['payment.accountNumber'] ?? current.accountNumber;
    const bank = patch['payment.bankCode'] ?? current.bankCode;
    if (!acc || !bank) {
      throw new AppError('Cần nhập Số tài khoản và Mã ngân hàng trước khi bật thanh toán.', 400);
    }
  }

  if (Object.keys(patch).length === 0) {
    return toPaymentPublic(await getSettings(false));
  }
  patch.updatedBy = actorEmail || '';

  const doc = await SystemSettings.findByIdAndUpdate(
    GLOBAL_ID,
    settingsUpsertUpdate(patch),
    SETTINGS_UPDATE_OPTIONS,
  ).lean();

  invalidateCache();
  await auditIfEnabled(doc, {
    actorEmail,
    action: 'Cập nhật cấu hình thanh toán (SePay)',
    category: 'payment',
    tone: 'primary',
    detail: `${doc.payment?.bankCode || '—'} · ${doc.payment?.accountNumber || '—'} · ${doc.payment?.enabled ? 'bật' : 'tắt'}`,
  });
  return toPaymentPublic(doc);
};

module.exports = {
  DEFAULTS,
  EMAIL_DEFAULTS,
  PAYMENT_DEFAULTS,
  SECURITY_DEFAULTS,
  STAFF_ROLES_DURING_MAINTENANCE,
  getSettings,
  getPublicStatus,
  getEmailSettings,
  getSecuritySettings,
  getPaymentSettings,
  getEmailPublic,
  getSecurityPublic,
  getPaymentPublic,
  toPublic,
  toEmailPublic,
  toSecurityPublic,
  toPaymentPublic,
  isStaffRole,
  assertLoginAllowed,
  updateMaintenanceSettings,
  updateEmailSettings,
  updateSecuritySettings,
  updatePaymentSettings,
  invalidateCache,
};
