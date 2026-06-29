export const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

const toMs = (value) => {
  if (!value) return NaN;
  const d = new Date(value);
  return d.getTime();
};

export const resolveTimeRange = (plannedDate, plannedEndDate) => {
  const startMs = toMs(plannedDate);
  if (Number.isNaN(startMs)) return null;

  let endMs = toMs(plannedEndDate);
  if (Number.isNaN(endMs) || endMs <= startMs) {
    endMs = startMs + DEFAULT_DURATION_MS;
  }

  return { startMs, endMs };
};

export const rangesOverlap = (a, b) => {
  if (!a || !b) return false;
  return a.startMs < b.endMs && b.startMs < a.endMs;
};

export const formatTimeRangeLabel = (startValue, endValue) => {
  const range = resolveTimeRange(startValue, endValue);
  if (!range) return '';

  const fmt = (ms) =>
    new Date(ms).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

  return `${fmt(range.startMs)}–${fmt(range.endMs)}`;
};

/** Default end = start + 2h (for datetime-local inputs). */
export const defaultEndDateTimeInput = (startInput) => {
  if (!startInput) return '';
  const d = new Date(startInput);
  if (Number.isNaN(d.getTime())) return '';
  d.setHours(d.getHours() + 2);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
