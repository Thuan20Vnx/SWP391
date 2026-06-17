const TTL_MS = 20_000;
const MAX_ENTRIES = 300;
const store = new Map();

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const set = (key, value) => {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + TTL_MS });
};

const invalidateEmail = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return;
  for (const key of store.keys()) {
    if (key.startsWith(`${normalized}:`)) store.delete(key);
  }
};

module.exports = { get, set, invalidateEmail };
