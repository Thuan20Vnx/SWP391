export const startOfLocalDay = (ref = new Date()) => {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  return d;
};

const pad2 = (n) => String(n).padStart(2, '0');

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const explainInvalidCalendarParts = ({ year, month, day, hour, minute }) => {
  if (!Number.isInteger(year) || year < 1) {
    return 'năm không hợp lệ';
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return 'tháng không hợp lệ (phải từ 1 đến 12)';
  }
  const maxDay = daysInMonth(year, month);
  if (!Number.isInteger(day) || day < 1 || day > maxDay) {
    return `tháng ${month} chỉ có ${maxDay} ngày`;
  }
  if (hour !== undefined && (!Number.isInteger(hour) || hour < 0 || hour > 23)) {
    return 'giờ không hợp lệ (phải từ 0 đến 23)';
  }
  if (minute !== undefined && (!Number.isInteger(minute) || minute < 0 || minute > 59)) {
    return 'phút không hợp lệ (phải từ 0 đến 59)';
  }
  return 'kiểm tra ngày và tháng';
};

const explainInvalidDateParts = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 'kiểm tra ngày và tháng';
  return explainInvalidCalendarParts({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  });
};

/** Human-readable hint for invalid datetime-local values. */
export const explainInvalidDatetimeLocal = (value) =>
  explainInvalidDateParts(value);

/** Human-readable hint for invalid date input values. */
export const explainInvalidDateInput = (value) =>
  explainInvalidDateParts(value);

export const formatInvalidDateMessage = (value) => {
  const detail = explainInvalidDateParts(value);
  if (detail.startsWith('tháng ') && detail.includes(' chỉ có ')) {
    return `Ngày không hợp lệ (kiểm tra ngày/tháng, ${detail}).`;
  }
  return `Ngày không hợp lệ (${detail}).`;
};

export const INVALID_DATE_MESSAGE = 'Ngày không hợp lệ (kiểm tra ngày và tháng).';

/** Parse YYYY-MM-DD without rolling invalid days into the next month. */
export const parseDateInput = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(year, month - 1, day);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return dt;
};

/** Parse datetime-local value without rolling invalid calendar dates. */
export const parseDatetimeLocalInput = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day ||
    dt.getHours() !== hour ||
    dt.getMinutes() !== minute
  ) {
    return null;
  }
  return dt;
};

export const isOnOrAfterToday = (value) => {
  if (!value) return false;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return false;
  return dt >= startOfLocalDay();
};

/** True when the datetime is at or after the current moment (blocks past time today). */
export const isOnOrAfterNow = (value, ref = new Date()) => {
  if (!value) return false;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return false;
  return dt >= ref;
};

export const toLocalDateInputMin = (ref = new Date()) => {
  const d = startOfLocalDay(ref);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const toLocalDatetimeInputMin = (ref = new Date()) => {
  const d = startOfLocalDay(ref);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T00:00`;
};
