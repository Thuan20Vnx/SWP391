/**
 * Kho OTP tạm cho việc đổi định danh (email đăng nhập / tên đăng nhập).
 *
 * Tách riêng khỏi otpStore.js vì luồng này khác hẳn đăng ký và quên mật khẩu:
 * khóa theo _id người dùng (không theo email — vì chính email đang bị đổi), và
 * đổi email cần HAI mã OTP cùng lúc.
 *
 * Lưu ý: chỉ nằm trong bộ nhớ, mất khi khởi động lại server. Với OTP sống 10
 * phút thì chấp nhận được, và đồng nhất với cách otpStore.js đang làm. Nếu sau
 * này chạy nhiều instance thì phải chuyển sang Redis (BE/src/config/redis.js).
 */

const crypto = require('crypto');
const AppError = require('./AppError');

const pendingIdentityChanges = new Map();

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
/** Đổi tên đăng nhập quá thường xuyên khiến người khác khó nhận ra tài khoản. */
const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/** OTP 6 số dùng crypto — không dùng Math.random cho dữ liệu bảo mật. */
const generateSecureOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/** So sánh chống rò rỉ thời gian, tránh dò từng ký tự của OTP. */
const safeCompareOtp = (a, b) => {
  const bufA = Buffer.from(String(a ?? ''), 'utf8');
  const bufB = Buffer.from(String(b ?? ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const keyOf = (userId) => String(userId);

const getEntry = (userId) => {
  const entry = pendingIdentityChanges.get(keyOf(userId));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt && !isLocked(entry)) {
    pendingIdentityChanges.delete(keyOf(userId));
    return null;
  }
  return entry;
};

const setEntry = (userId, entry) => {
  pendingIdentityChanges.set(keyOf(userId), entry);
  return entry;
};

const clearEntry = (userId) => {
  pendingIdentityChanges.delete(keyOf(userId));
};

const isLocked = (entry) => Boolean(entry?.lockedUntil && Date.now() < entry.lockedUntil);

const getLockRemainingSeconds = (entry) =>
  isLocked(entry) ? Math.ceil((entry.lockedUntil - Date.now()) / 1000) : 0;

const throwLockedError = (entry) => {
  const retryAfterSeconds = getLockRemainingSeconds(entry);
  const err = new AppError(
    `Bạn đã nhập sai mã xác minh quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(retryAfterSeconds / 60)} phút.`,
    423,
  );
  err.extra = { code: 'OTP_LOCKED', retryAfterSeconds, remainingAttempts: 0 };
  throw err;
};

const createEntry = ({
  type,
  newEmail = '',
  newUsername = '',
  otpCurrent,
  otpNew = '',
  // Đã băm sẵn bằng bcrypt trước khi vào đây — không giữ mật khẩu thô trong bộ nhớ
  // suốt 10 phút chờ OTP.
  passwordHash = '',
}) => ({
  type,
  newEmail,
  newUsername,
  otpCurrent,
  otpNew,
  passwordHash,
  expiresAt: Date.now() + OTP_TTL_MS,
  failedAttempts: 0,
  lockedUntil: null,
});

/** Ghi nhận một lần nhập sai; khóa tạm khi vượt ngưỡng. */
const recordFailedAttempt = (entry) => {
  entry.failedAttempts += 1;
  if (entry.failedAttempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.failedAttempts = 0;
  }
  return entry;
};

const getRemainingAttempts = (entry) => Math.max(0, MAX_ATTEMPTS - (entry?.failedAttempts || 0));

module.exports = {
  pendingIdentityChanges,
  OTP_TTL_MS,
  MAX_ATTEMPTS,
  LOCK_MS,
  USERNAME_CHANGE_COOLDOWN_MS,
  generateSecureOtp,
  safeCompareOtp,
  getEntry,
  setEntry,
  clearEntry,
  isLocked,
  getLockRemainingSeconds,
  throwLockedError,
  createEntry,
  recordFailedAttempt,
  getRemainingAttempts,
};
