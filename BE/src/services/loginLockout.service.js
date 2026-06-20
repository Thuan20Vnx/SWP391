const crypto = require('crypto');
const bcrypt = require('bcrypt');
const LoginLockout = require('../models/LoginLockout');
const AppError = require('../utils/AppError');
const { sendLoginLockAlertEmail } = require('./email.service');

const DEFAULT_ATTEMPTS_PER_TIER = 5;
const TIER1_LOCK_MS = 30 * 1000;
const DEFAULT_TIER2_LOCK_MS = 3 * 60 * 1000;
const UNLOCK_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

// Đọc ngưỡng từ cấu hình hệ thống (require trễ tránh phụ thuộc vòng).
const getLockoutPolicy = async () => {
  try {
    const { getSecuritySettings } = require('./systemSettings.service');
    const s = await getSecuritySettings();
    return {
      maxAttempts: Math.max(1, Number(s.maxLoginAttempts) || DEFAULT_ATTEMPTS_PER_TIER),
      tier2LockMs: Math.max(1, Number(s.lockoutMinutes) || 3) * 60 * 1000,
    };
  } catch {
    return { maxAttempts: DEFAULT_ATTEMPTS_PER_TIER, tier2LockMs: DEFAULT_TIER2_LOCK_MS };
  }
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const hashUnlockToken = (token) =>
  crypto.createHash('sha256').update(String(token).trim()).digest('hex');

const getLockRemainingSeconds = (lockedUntil) => {
  if (!lockedUntil) return 0;
  const ms = new Date(lockedUntil).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 1000));
};

const clearExpiredTempLock = (record) => {
  if (record.emailLocked) return record;
  if (!record.lockedUntil) return record;
  if (new Date(record.lockedUntil) > new Date()) return record;

  record.lockedUntil = null;
  record.failedAttempts = 0;
  return record;
};

const throwEmailLockedError = () => {
  const err = new AppError(
    'Tài khoản đã bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng kiểm tra email và bấm liên kết mở khóa.',
    423
  );
  err.extra = { code: 'LOGIN_EMAIL_LOCKED', remainingAttempts: 0 };
  throw err;
};

const throwTempLockedError = (record, maxAttempts = DEFAULT_ATTEMPTS_PER_TIER) => {
  const retryAfterSeconds = getLockRemainingSeconds(record.lockedUntil);
  const err = new AppError(
    `Bạn đã nhập sai mật khẩu quá ${maxAttempts} lần. Vui lòng thử lại sau ${retryAfterSeconds} giây.`,
    423
  );
  err.extra = {
    code: 'LOGIN_LOCKED',
    retryAfterSeconds,
    remainingAttempts: 0,
    penaltyStage: record.penaltyStage,
  };
  throw err;
};

const assertLoginAllowed = async (email) => {
  const key = normalizeEmail(email);
  const record = await LoginLockout.findOne({ email: key });
  if (!record) return;

  clearExpiredTempLock(record);
  if (record.isModified()) await record.save();

  if (record.emailLocked) throwEmailLockedError();

  if (getLockRemainingSeconds(record.lockedUntil) > 0) {
    const { maxAttempts } = await getLockoutPolicy();
    throwTempLockedError(record, maxAttempts);
  }
};

const applyTierLock = async (record, userForEmail, tier2LockMs = DEFAULT_TIER2_LOCK_MS) => {
  if (record.penaltyStage === 0) {
    record.lockedUntil = new Date(Date.now() + TIER1_LOCK_MS);
    record.failedAttempts = 0;
    record.penaltyStage = 1;
    await record.save();
    return record;
  }

  if (record.penaltyStage === 1) {
    record.lockedUntil = new Date(Date.now() + tier2LockMs);
    record.failedAttempts = 0;
    record.penaltyStage = 2;
    await record.save();
    return record;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  record.emailLocked = true;
  record.lockedUntil = null;
  record.failedAttempts = 0;
  record.unlockTokenHash = hashUnlockToken(rawToken);
  record.unlockTokenExpires = new Date(Date.now() + UNLOCK_TOKEN_TTL_MS);
  await record.save();

  if (userForEmail?.email) {
    sendLoginLockAlertEmail(
      userForEmail.email,
      userForEmail.fullname || 'Người dùng',
      rawToken
    ).catch((err) => {
      console.error('[LoginLockout] Gửi email cảnh báo thất bại:', err.message);
    });
  }

  return record;
};

const recordFailedLogin = async (email, userForEmail = null) => {
  const key = normalizeEmail(email);
  let record = await LoginLockout.findOne({ email: key });

  if (!record) {
    record = new LoginLockout({ email: key });
  }

  clearExpiredTempLock(record);

  if (record.emailLocked) return record;

  if (getLockRemainingSeconds(record.lockedUntil) > 0) {
    return record;
  }

  record.failedAttempts += 1;

  const { maxAttempts, tier2LockMs } = await getLockoutPolicy();
  if (record.failedAttempts >= maxAttempts) {
    return applyTierLock(record, userForEmail, tier2LockMs);
  }

  await record.save();
  return record;
};

const throwAfterFailedLogin = async (record) => {
  clearExpiredTempLock(record);

  if (record.emailLocked) {
    const err = new AppError(
      'Tài khoản đã bị khóa do nhập sai mật khẩu quá nhiều lần. Chúng tôi đã gửi email hướng dẫn mở khóa.',
      423
    );
    err.extra = { code: 'LOGIN_EMAIL_LOCKED', remainingAttempts: 0 };
    throw err;
  }

  const { maxAttempts } = await getLockoutPolicy();
  if (getLockRemainingSeconds(record.lockedUntil) > 0) {
    throwTempLockedError(record, maxAttempts);
  }

  const remainingAttempts = Math.max(0, maxAttempts - record.failedAttempts);
  const err = new AppError(
    remainingAttempts > 0
      ? `Tài khoản hoặc mật khẩu không chính xác. Bạn còn ${remainingAttempts} lần thử.`
      : 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại!',
    401
  );
  err.extra = {
    code: 'LOGIN_INVALID',
    remainingAttempts,
  };
  throw err;
};

const clearLoginLockout = async (email) => {
  await LoginLockout.deleteOne({ email: normalizeEmail(email) });
};

const unlockAccount = async (token) => {
  if (!token?.trim()) {
    throw new AppError('Liên kết mở khóa không hợp lệ.', 400);
  }

  const record = await LoginLockout.findOne({
    unlockTokenHash: hashUnlockToken(token),
    emailLocked: true,
    unlockTokenExpires: { $gt: new Date() },
  }).select('+unlockTokenHash +unlockTokenExpires');

  if (!record) {
    throw new AppError('Liên kết mở khóa không hợp lệ hoặc đã hết hạn.', 400);
  }

  await LoginLockout.deleteOne({ _id: record._id });

  return {
    message: 'Tài khoản đã được mở khóa. Bạn có thể đăng nhập lại.',
    email: record.email,
  };
};

const verifyPasswordWithTiming = async (password, passwordHash) => {
  const hash = passwordHash || DUMMY_PASSWORD_HASH;
  return bcrypt.compare(password, hash);
};

module.exports = {
  ATTEMPTS_PER_TIER: DEFAULT_ATTEMPTS_PER_TIER,
  assertLoginAllowed,
  recordFailedLogin,
  throwAfterFailedLogin,
  clearLoginLockout,
  unlockAccount,
  verifyPasswordWithTiming,
};
