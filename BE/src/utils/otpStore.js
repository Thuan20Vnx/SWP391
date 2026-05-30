const { OTP_EXPIRY_MINUTES } = require('../config/env');

const pendingUsers = new Map();
const OTP_TTL_MS = OTP_EXPIRY_MINUTES * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_SIGNUP_LOCK_MS = 2 * 60 * 1000;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const isExpired = (entry) => Date.now() > entry.expiresAt;

const createPendingResetEntry = ({ email, otp, expiresAt }) => ({
  email,
  otp,
  expiresAt,
  failedAttempts: 0,
  locked: false,
});

const createPendingSignupEntry = ({ fullname, email, phone, passwordHash, otp, expiresAt }) => ({
  fullname,
  email,
  phone,
  passwordHash,
  otp,
  expiresAt,
  failedAttempts: 0,
  lockedUntil: null,
});

const clearExpiredOtpLock = (entry) => {
  if (!entry?.lockedUntil) return false;
  if (Date.now() < entry.lockedUntil) return false;
  entry.failedAttempts = 0;
  entry.lockedUntil = null;
  return true;
};

const isEntryOtpLocked = (entry) => {
  if (!entry) return false;
  clearExpiredOtpLock(entry);
  if (entry.locked === true) return true;
  return Boolean(entry.lockedUntil && Date.now() < entry.lockedUntil);
};

const getLockRemainingSeconds = (entry) => {
  if (!entry?.lockedUntil) return 0;
  return Math.max(0, Math.ceil((entry.lockedUntil - Date.now()) / 1000));
};

const recordFailedOtpAttempt = (entry, { lockDurationMs = 0 } = {}) => {
  entry.failedAttempts = (entry.failedAttempts || 0) + 1;
  if (entry.failedAttempts >= MAX_OTP_ATTEMPTS) {
    if (lockDurationMs > 0) {
      entry.lockedUntil = Date.now() + lockDurationMs;
      entry.locked = false;
    } else {
      entry.locked = true;
    }
  }
  return entry;
};

const getRemainingOtpAttempts = (entry) =>
  Math.max(0, MAX_OTP_ATTEMPTS - (entry.failedAttempts || 0));

const throwOtpLockedError = (entry, context = 'signup') => {
  const AppError = require('./AppError');
  const retryAfterSeconds = getLockRemainingSeconds(entry);

  if (context === 'signup') {
    const err = new AppError(
      `Bạn đã nhập sai OTP quá ${MAX_OTP_ATTEMPTS} lần. Vui lòng thử lại sau 2 phút.`,
      423
    );
    err.extra = {
      code: 'OTP_LOCKED',
      retryAfterSeconds,
      remainingAttempts: 0,
    };
    throw err;
  }

  const err = new AppError(
    `Bạn đã nhập sai OTP quá ${MAX_OTP_ATTEMPTS} lần. Vui lòng quay lại trang Quên mật khẩu để nhận mã mới.`,
    423
  );
  err.extra = { code: 'OTP_LOCKED', retryAfterSeconds: 0, remainingAttempts: 0 };
  throw err;
};

module.exports = {
  pendingUsers,
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  OTP_SIGNUP_LOCK_MS,
  generateOtp,
  isExpired,
  createPendingResetEntry,
  createPendingSignupEntry,
  recordFailedOtpAttempt,
  getRemainingOtpAttempts,
  isEntryOtpLocked,
  getLockRemainingSeconds,
  clearExpiredOtpLock,
  throwOtpLockedError,
};
