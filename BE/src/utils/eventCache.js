let approvedEventsCache = null;

const getCachedApprovedEvents = () => {
  return approvedEventsCache;
};

const setCachedApprovedEvents = (events) => {
  approvedEventsCache = events;
};

const clearEventCache = () => {
  approvedEventsCache = null;
};

module.exports = {
  getCachedApprovedEvents,
  setCachedApprovedEvents,
  clearEventCache,
};
