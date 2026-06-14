/**
 * apiCache.js — Bộ nhớ đệm (cache) toàn cục cho API responses.
 *
 * Khi người dùng chuyển trang rồi quay lại, dữ liệu đã tải trước đó
 * sẽ được trả ngay lập tức từ bộ nhớ đệm thay vì gọi lại API.
 * Cache tự hết hạn sau TTL (mặc định 60 giây).
 */

const _cache = new Map();

const DEFAULT_TTL = 60_000; // 60 giây

/**
 * Lấy dữ liệu từ cache nếu còn hạn.
 * @param {string} key
 * @returns {*|null}
 */
export const getCached = (key) => {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
};

/**
 * Lưu dữ liệu vào cache.
 * @param {string} key
 * @param {*} data
 * @param {number} [ttl]
 */
export const setCache = (key, data, ttl = DEFAULT_TTL) => {
  _cache.set(key, { data, ts: Date.now(), ttl });
};

/**
 * Xóa một key hoặc tất cả cache khớp prefix.
 * @param {string} keyOrPrefix
 */
export const invalidateCache = (keyOrPrefix) => {
  for (const k of _cache.keys()) {
    if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
      _cache.delete(k);
    }
  }
};

/**
 * Xóa toàn bộ cache (dùng khi logout).
 */
export const clearAllCache = () => _cache.clear();

/**
 * Fetch với cache — wrapper cho fetch thông thường.
 * Nếu dữ liệu đã có trong cache và chưa hết hạn, trả về ngay.
 * Nếu không, gọi fetchFn rồi lưu kết quả vào cache.
 *
 * @param {string} cacheKey - Khóa cache duy nhất
 * @param {() => Promise<*>} fetchFn - Hàm fetch thực tế
 * @param {object} [options]
 * @param {number} [options.ttl] - Thời gian sống cache (ms)
 * @param {boolean} [options.forceRefresh] - Bỏ qua cache, luôn gọi API
 * @returns {Promise<*>}
 */
export const cachedFetch = async (cacheKey, fetchFn, options = {}) => {
  const { ttl = DEFAULT_TTL, forceRefresh = false } = options;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached !== null) return cached;
  }

  const data = await fetchFn();
  setCache(cacheKey, data, ttl);
  return data;
};

// Dedup: nếu cùng 1 key đang fetch, tái sử dụng promise đang chạy
const _inflight = new Map();

/**
 * Fetch với cache + dedup (tránh gọi trùng cùng lúc).
 */
export const cachedFetchDedup = (cacheKey, fetchFn, options = {}) => {
  const { ttl = DEFAULT_TTL, forceRefresh = false } = options;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached !== null) return Promise.resolve(cached);
  }

  if (_inflight.has(cacheKey)) return _inflight.get(cacheKey);

  const promise = fetchFn()
    .then((data) => {
      setCache(cacheKey, data, ttl);
      _inflight.delete(cacheKey);
      return data;
    })
    .catch((err) => {
      _inflight.delete(cacheKey);
      throw err;
    });

  _inflight.set(cacheKey, promise);
  return promise;
};
