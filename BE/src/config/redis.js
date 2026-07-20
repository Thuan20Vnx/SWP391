const Redis = require('ioredis');

/**
 * Kết nối Redis dùng cho rate limiting.
 *
 * Redis là TÙY CHỌN: thiếu REDIS_URL (máy dev, hoặc Render chưa gắn Redis) thì
 * hệ thống vẫn chạy bình thường và rate limit tự lùi về bộ đếm in-memory.
 * Bộ đếm in-memory chỉ đúng trong phạm vi một tiến trình — chấp nhận được ở dev,
 * nhưng khi chạy nhiều instance thì mỗi instance đếm riêng nên hạn mức thực tế
 * bị nhân lên theo số instance. Đó chính là lý do production cần Redis.
 */

const REDIS_URL = process.env.REDIS_URL || '';

let client = null;
let usable = false;

if (REDIS_URL) {
  client = new Redis(REDIS_URL, {
    // Không để rate limit làm treo request khi Redis trục trặc: thà cho qua
    // còn hơn chặn người dùng thật vì hạ tầng phụ trợ chết.
    connectTimeout: 3_000,
    commandTimeout: 1_000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 200, 5_000),
    lazyConnect: false,
  });

  client.on('ready', () => {
    usable = true;
    console.log('[Redis] Đã kết nối — rate limit dùng bộ đếm chia sẻ.');
  });

  client.on('error', (err) => {
    if (usable) console.warn('[Redis] Mất kết nối:', err.message);
    usable = false;
  });

  client.on('end', () => {
    usable = false;
  });
} else {
  console.log('[Redis] Không có REDIS_URL — rate limit dùng bộ đếm in-memory (chỉ hợp cho dev).');
}

/** Redis đang sẵn sàng nhận lệnh hay không. */
const isRedisReady = () => usable && client?.status === 'ready';

const getRedis = () => client;

const closeRedis = async () => {
  if (client) {
    await client.quit().catch(() => {});
    usable = false;
  }
};

module.exports = { getRedis, isRedisReady, closeRedis };
