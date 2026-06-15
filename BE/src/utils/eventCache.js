let approvedEventsCache = null;
let approvedEventsCacheTs = 0;

const APPROVED_EVENTS_TTL_MS = 5 * 60 * 1000;

const getCachedApprovedEvents = () => {
  if (!approvedEventsCache) return null;
  if (Date.now() - approvedEventsCacheTs > APPROVED_EVENTS_TTL_MS) {
    approvedEventsCache = null;
    approvedEventsCacheTs = 0;
    return null;
  }
  return approvedEventsCache;
};

const setCachedApprovedEvents = (events) => {
  approvedEventsCache = events;
  approvedEventsCacheTs = Date.now();
};

const clearEventCache = () => {
  approvedEventsCache = null;
  approvedEventsCacheTs = 0;
};

module.exports = {
  getCachedApprovedEvents,
  setCachedApprovedEvents,
  clearEventCache,
};
