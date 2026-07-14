const AppError = require('./AppError');

const startOfLocalDay = (ref = new Date()) => {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const explainInvalidDateParts = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 'kiểm tra ngày và tháng';

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || year < 1) return 'năm không hợp lệ';
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return 'tháng không hợp lệ (phải từ 1 đến 12)';
  }

  const maxDay = daysInMonth(year, month);
  if (!Number.isInteger(day) || day < 1 || day > maxDay) {
    return `tháng ${month} chỉ có ${maxDay} ngày`;
  }

  return 'kiểm tra ngày và tháng';
};

const formatInvalidDateHint = (value) => {
  const detail = explainInvalidDateParts(value);
  if (detail.startsWith('tháng ') && detail.includes(' chỉ có ')) {
    return `Ngày không hợp lệ (kiểm tra ngày/tháng, ${detail}).`;
  }
  return `Ngày không hợp lệ (${detail}).`;
};

const parseStrictInstant = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (localMatch) {
    const year = Number(localMatch[1]);
    const month = Number(localMatch[2]);
    const day = Number(localMatch[3]);
    const hour = Number(localMatch[4] ?? 0);
    const minute = Number(localMatch[5] ?? 0);
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
  }

  const dt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const isOnOrAfterToday = (value) => {
  const dt = parseStrictInstant(value);
  if (!dt) return false;
  return dt >= startOfLocalDay();
};

const assertOnOrAfterToday = (value, fieldLabel) => {
  if (!value) return;
  const dt = parseStrictInstant(value);
  if (!dt) {
    throw new AppError(`${fieldLabel} không hợp lệ. ${formatInvalidDateHint(value)}`, 400);
  }
  if (!isOnOrAfterToday(dt)) {
    throw new AppError(`${fieldLabel} phải từ hôm nay trở đi.`, 400);
  }
};

// So sánh theo đúng mốc thời gian (kể cả giờ/phút), tránh reinterpret local của parseStrictInstant.
const parseInstant = (value) => {
  if (!value) return null;
  const dt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

// Chặn thời điểm trong quá khứ; chừa 2 phút để bù lệch đồng hồ / độ trễ mạng.
const PAST_GRACE_MS = 2 * 60 * 1000;

const assertNotPastInstant = (value, fieldLabel) => {
  if (!value) return;
  const dt = parseInstant(value);
  if (!dt) {
    throw new AppError(`${fieldLabel} không hợp lệ. ${formatInvalidDateHint(value)}`, 400);
  }
  if (dt.getTime() < Date.now() - PAST_GRACE_MS) {
    throw new AppError(`${fieldLabel} không được ở trong quá khứ.`, 400);
  }
};

const assertEventScheduleDates = ({ registrationStartDate, startDate }) => {
  assertNotPastInstant(registrationStartDate, 'Thời gian bắt đầu đăng ký');
  assertNotPastInstant(startDate, 'Thời gian bắt đầu sự kiện');
};

module.exports = {
  startOfLocalDay,
  isOnOrAfterToday,
  parseStrictInstant,
  formatInvalidDateHint,
  assertOnOrAfterToday,
  assertNotPastInstant,
  assertEventScheduleDates,
};
