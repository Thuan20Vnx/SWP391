const { getRedis, isRedisReady } = require('../config/redis');
const AppError = require('../utils/AppError');

/**
 * Rate limiting theo IP bằng thuật toán fixed-window.
 *
 * Vì sao đặt trước controller: loginLockout đã chặn brute-force theo email, nhưng
 * mỗi lần thử vẫn tốn một truy vấn MongoDB và một phép so sánh BCrypt (~100ms).
 * Chặn ngay ở tầng middleware giúp request vượt hạn mức bị loại trước khi chạm
 * tới DB hay BCrypt — vừa rẻ hơn nhiều, vừa giữ cho DB không bị kéo sập khi bị spam.
 *
 * Vì sao Redis: bộ đếm phải dùng chung giữa các instance. Nếu đếm in-memory,
 * chạy 3 instance sau load balancer thì hạn mức thực tế bị nhân 3.
 */

const LUA_FIXED_WINDOW = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return { current, redis.call('PTTL', KEYS[1]) }
`;

let scriptRegistered = false;

const ensureScript = (redis) => {
  if (scriptRegistered || !redis) return;
  // defineCommand dùng EVALSHA, chỉ gửi nguyên văn script khi Redis chưa cache.
  redis.defineCommand('rateLimitHit', { numberOfKeys: 1, lua: LUA_FIXED_WINDOW });
  scriptRegistered = true;
};

/* ------------------------------------------------------------------ */
/* Fallback in-memory: chỉ đúng trong một tiến trình, dùng khi dev.     */
/* ------------------------------------------------------------------ */

const memoryBuckets = new Map();

const memoryHit = (key, windowMs) => {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { count: 1, ttl: windowMs };
  }

  bucket.count += 1;
  return { count: bucket.count, ttl: bucket.resetAt - now };
};

// Dọn định kỳ để Map không phình vô hạn theo số IP đã từng gọi.
// unref() để timer này không giữ cho tiến trình sống khi server đã tắt.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}, 60_000);
cleanupTimer.unref();

/* ------------------------------------------------------------------ */

const hit = async (key, windowMs) => {
  const redis = getRedis();

  if (isRedisReady()) {
    try {
      ensureScript(redis);
      const [count, ttl] = await redis.rateLimitHit(key, windowMs);
      return { count, ttl: ttl > 0 ? ttl : windowMs };
    } catch (err) {
      // Redis lỗi giữa chừng: hạ xuống bộ đếm in-memory thay vì trả 500.
      // Rate limit là lớp bảo vệ phụ, không được phép làm chết luồng đăng nhập.
      console.warn('[RateLimit] Redis lỗi, tạm dùng bộ đếm in-memory:', err.message);
    }
  }

  return memoryHit(key, windowMs);
};

const clientIp = (req) =>
  // trust proxy đã bật trong app.js nên req.ip là IP thật của client sau Render.
  req.ip || req.connection?.remoteAddress || 'unknown';

/**
 * Tạo middleware giới hạn số request theo IP.
 *
 * @param {object}   options
 * @param {string}   options.name      Tên nhóm hạn mức, dùng làm tiền tố khóa.
 * @param {number}   options.limit     Số request tối đa trong một cửa sổ.
 * @param {number}   options.windowMs  Độ dài cửa sổ (ms).
 * @param {Function} [options.resolveLimit] Hàm async trả về hạn mức động (đọc từ
 *   SystemSettings). Lỗi hoặc trả về giá trị không hợp lệ thì dùng `limit`.
 * @param {string}   [options.message] Thông báo khi vượt hạn mức.
 */
const rateLimit = ({ name, limit, windowMs, resolveLimit, message }) => {
  const fallbackMessage = message
    || 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';

  return async (req, res, next) => {
    try {
      let effectiveLimit = limit;
      if (resolveLimit) {
        try {
          const dynamic = Number(await resolveLimit());
          if (Number.isFinite(dynamic) && dynamic > 0) effectiveLimit = dynamic;
        } catch {
          // Không đọc được cấu hình thì giữ hạn mức mặc định.
        }
      }

      const key = `rl:${name}:${clientIp(req)}`;
      const { count, ttl } = await hit(key, windowMs);
      const remaining = Math.max(0, effectiveLimit - count);
      const retryAfterSeconds = Math.max(1, Math.ceil(ttl / 1000));

      res.setHeader('X-RateLimit-Limit', String(effectiveLimit));
      res.setHeader('X-RateLimit-Remaining', String(remaining));

      if (count > effectiveLimit) {
        res.setHeader('Retry-After', String(retryAfterSeconds));
        const err = new AppError(fallbackMessage, 429);
        err.extra = { code: 'RATE_LIMITED', retryAfterSeconds };
        throw err;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { rateLimit };
