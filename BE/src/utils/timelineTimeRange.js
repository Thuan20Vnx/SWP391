const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

const toMs = (value) => {
  if (!value) return NaN;
  const d = new Date(value);
  return d.getTime();
};

/**
 * Resolve [start, end) for a timeline item or event slot.
 * Falls back to +2h when end is missing or invalid.
 */
const resolveTimeRange = (plannedDate, plannedEndDate) => {
  const startMs = toMs(plannedDate);
  if (Number.isNaN(startMs)) return null;

  let endMs = toMs(plannedEndDate);
  if (Number.isNaN(endMs) || endMs <= startMs) {
    endMs = startMs + DEFAULT_DURATION_MS;
  }

  return { startMs, endMs };
};

const rangesOverlap = (a, b) => {
  if (!a || !b) return false;
  return a.startMs < b.endMs && b.startMs < a.endMs;
};

const formatTimeRangeLabel = (startValue, endValue, { timeZone = 'Asia/Ho_Chi_Minh' } = {}) => {
  const range = resolveTimeRange(startValue, endValue);
  if (!range) return '';

  const fmt = (ms) =>
    new Date(ms).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    });

  return `${fmt(range.startMs)}–${fmt(range.endMs)}`;
};

module.exports = {
  DEFAULT_DURATION_MS,
  resolveTimeRange,
  rangesOverlap,
  formatTimeRangeLabel,
};
