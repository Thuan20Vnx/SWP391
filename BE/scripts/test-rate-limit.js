/**
 * Kiểm chứng middleware rate limit theo IP.
 *
 * Gọi thẳng middleware với req/res giả nên không cần dựng server, và cũng chứng
 * minh được điều quan trọng nhất: request vượt hạn mức bị chặn NGAY tại middleware,
 * không hề đi tiếp xuống controller (tức không tốn truy vấn MongoDB / BCrypt).
 *
 * Chạy:  node scripts/test-rate-limit.js
 * Có REDIS_URL thì test chạy trên Redis, không có thì trên bộ đếm in-memory.
 */
require('dotenv').config();
const { rateLimit } = require('../src/middleware/rateLimit.middleware');
const { isRedisReady, getRedis, closeRedis } = require('../src/config/redis');

const LIMIT = 5;
const WINDOW_MS = 2_000;

// req/res giả tối thiểu, đủ cho middleware chạy.
const fakeReq = (ip) => ({ ip });
const fakeRes = () => {
  const headers = {};
  return {
    setHeader: (k, v) => {
      headers[k] = v;
    },
    getHeader: (k) => headers[k],
  };
};

/**
 * Chạy middleware một lần.
 * @returns {Promise<{passed: boolean, status?: number, retryAfter?: string}>}
 *   passed = true nghĩa là next() được gọi -> request sẽ đi tiếp tới controller.
 */
const callOnce = (middleware, ip) =>
  new Promise((resolve) => {
    const res = fakeRes();
    middleware(fakeReq(ip), res, (err) => {
      if (err) {
        resolve({
          passed: false,
          status: err.statusCode,
          retryAfter: res.getHeader('Retry-After'),
          remaining: res.getHeader('X-RateLimit-Remaining'),
        });
      } else {
        resolve({ passed: true, remaining: res.getHeader('X-RateLimit-Remaining') });
      }
    });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (label, actual, expected) => {
  const ok = actual === expected;
  results.push(ok);
  console.log(`    ${ok ? 'ĐẠT     ' : 'KHÔNG ĐẠT'} ${label}: ${actual} (kỳ vọng ${expected})`);
};

const main = async () => {
  // Chờ Redis kịp handshake trước khi kết luận đang dùng backend nào.
  await sleep(600);
  const backend = isRedisReady() ? 'Redis (bộ đếm chia sẻ)' : 'in-memory (fallback)';
  console.log(`Kiểm chứng rate limit — backend: ${backend}`);
  console.log(`Cấu hình test: ${LIMIT} request / ${WINDOW_MS}ms\n`);

  const uniq = Date.now();
  const limiter = rateLimit({ name: `test-${uniq}`, limit: LIMIT, windowMs: WINDOW_MS });

  // [1] Đúng LIMIT request đầu được đi tiếp, phần còn lại bị chặn.
  console.log(`[1] Bắn ${LIMIT * 2} request từ cùng một IP`);
  const ipA = '10.0.0.1';
  const batch = [];
  for (let i = 0; i < LIMIT * 2; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    batch.push(await callOnce(limiter, ipA));
  }
  const passed = batch.filter((r) => r.passed).length;
  const blocked = batch.filter((r) => !r.passed);

  check('Số request đi tiếp tới controller', passed, LIMIT);
  check('Số request bị chặn tại middleware', blocked.length, LIMIT);
  check('Mã lỗi khi vượt hạn mức', blocked[0]?.status, 429);
  check('Có header Retry-After', Boolean(blocked[0]?.retryAfter), true);
  check('X-RateLimit-Remaining khi đã cạn', blocked[0]?.remaining, '0');

  // [2] IP khác phải có hạn mức riêng — nếu không, một kẻ spam sẽ khóa cả trường.
  console.log('\n[2] IP khác không bị ảnh hưởng bởi IP đang bị chặn');
  const other = await callOnce(limiter, '10.0.0.2');
  check('Request từ IP khác đi tiếp', other.passed, true);

  // [3] Hết cửa sổ thì hạn mức phải mở lại (TTL do Redis/bộ đếm tự hết hạn).
  console.log(`\n[3] Chờ ${WINDOW_MS}ms cho cửa sổ trôi qua rồi thử lại`);
  await sleep(WINDOW_MS + 300);
  const afterWindow = await callOnce(limiter, ipA);
  check('IP cũ được phép trở lại sau khi hết cửa sổ', afterWindow.passed, true);

  // [4] Khóa Redis phải có TTL. Thiếu TTL thì key sống mãi và IP bị khóa vĩnh viễn —
  //     đây chính là lý do INCR và EXPIRE phải nằm trong cùng một Lua script.
  if (isRedisReady()) {
    console.log('\n[4] Khóa trên Redis phải có TTL');
    const ttl = await getRedis().pttl(`rl:test-${uniq}:10.0.0.2`);
    check('TTL được đặt (ms > 0)', ttl > 0, true);
  } else {
    console.log('\n[4] BỎ QUA kiểm tra TTL trên Redis (không có REDIS_URL)');
  }

  const allPassed = results.every(Boolean);
  console.log(allPassed ? '\nTẤT CẢ ĐẠT' : '\nCÓ KIỂM TRA KHÔNG ĐẠT');

  await closeRedis();
  process.exit(allPassed ? 0 : 1);
};

main().catch(async (err) => {
  console.error('\nScript lỗi:', err);
  await closeRedis();
  process.exit(1);
});
