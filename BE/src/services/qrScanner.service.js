const crypto = require('crypto');
const Event = require('../models/Event');
const Club = require('../models/Club');
const EventRegistration = require('../models/EventRegistration');
const AppError = require('../utils/AppError');
const emailService = require('./email.service');

const QR_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_QR_DURATION_MINUTES = 7 * 24 * 60;
const ATTENDANCE_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ATTENDANCE_CODE_REGEX = /^[A-Za-z0-9]{6}$/;

/**
 * Chỉ được tạo mã QR điểm danh khi sự kiện đã được duyệt (đang mở đăng ký,
 * đang diễn ra, hoặc đã kết thúc — cho check-out trễ). Các trạng thái còn chờ
 * duyệt / bản nháp / bị từ chối thì không có mã QR.
 */
const QR_BLOCKED_STATUSES = new Set([
  'pending',
  'pending_ctsv',
  'pending_icpdp',
  'pending_admin',
  'revision',
  'draft',
  'rejected',
]);

const parseDurationMinutes = (raw) => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
  const minutes = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(minutes) ? minutes : NaN;
};

const resolveQrExpiresAt = (body = {}) => {
  const now = new Date();

  if (body.expiresAt) {
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError('Thời gian hết hạn không hợp lệ.', 400);
    }
    if (parsed <= now) {
      throw new AppError('Thời gian hết hạn phải ở tương lai.', 400);
    }
    return parsed;
  }

  const minutes = parseDurationMinutes(body.durationMinutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    if (minutes > MAX_QR_DURATION_MINUTES) {
      throw new AppError('Thời gian hiệu lực tối đa là 7 ngày.', 400);
    }
    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  return new Date(now.getTime() + QR_TTL_MS);
};

const resolveManagedClub = async (userId) => {
  let club = await Club.findOne({ managedBy: userId });
  if (!club) {
    const { MANAGED_CLUB_SLUG } = require('./club.service');
    club = await Club.findOne({ slug: MANAGED_CLUB_SLUG });
  }
  return club;
};

const canUserManageEventQr = async (user, event) => {
  if (!user || !event) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'club_manager' && event.source === 'club') {
    if (String(event.createdBy) === String(user._id)) return true;
    const club = await resolveManagedClub(user._id);
    return club && String(club.managedBy) === String(user._id);
  }
  if (user.role === 'icpdp' && event.source === 'school' && event.schoolOrganizerRole === 'icpdp') return true;
  if (user.role === 'ctsv') return ['school', 'partner', 'club'].includes(event.source);
  return false;
};

const assertCanManageEventQr = async (user, eventId) => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) throw new AppError('Không tìm thấy sự kiện.', 404);
  if (!(await canUserManageEventQr(user, event))) {
    throw new AppError('Bạn không có quyền quản lý mã QR cho sự kiện này.', 403);
  }
  return event;
};

const isTokenActive = (token, expiresAt) => {
  if (!token) return false;
  if (!expiresAt) return true;
  return new Date(expiresAt) > new Date();
};

const normalizeAttendanceCode = (code) => String(code || '').trim().toUpperCase();

const isValidAttendanceCodeFormat = (code) => ATTENDANCE_CODE_REGEX.test(normalizeAttendanceCode(code));

const generateAttendanceCode = () => {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += ATTENDANCE_CODE_CHARS[crypto.randomInt(0, ATTENDANCE_CODE_CHARS.length)];
  }
  return code;
};

const isAttendanceCodeInUse = async (code) => {
  const existing = await Event.findOne({
    isDeleted: false,
    $or: [{ checkinAttendanceCode: code }, { checkoutAttendanceCode: code }],
  }).select('checkinAttendanceCode checkoutAttendanceCode checkinQrToken checkinQrExpiresAt checkoutQrToken checkoutQrExpiresAt');

  if (!existing) return false;

  if (
    existing.checkinAttendanceCode === code
    && isTokenActive(existing.checkinQrToken, existing.checkinQrExpiresAt)
  ) {
    return true;
  }

  if (
    existing.checkoutAttendanceCode === code
    && isTokenActive(existing.checkoutQrToken, existing.checkoutQrExpiresAt)
  ) {
    return true;
  }

  return false;
};

const generateUniqueAttendanceCode = async () => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const code = generateAttendanceCode();
    if (!(await isAttendanceCodeInUse(code))) return code;
  }
  throw new AppError('Không thể tạo mã điểm danh. Vui lòng thử lại.', 500);
};

const buildStationPayload = (eventId, action, token) => JSON.stringify({
  type: 'fpt-event-station',
  eventId: String(eventId),
  action,
  token,
});

const getStationCredentials = (event, action) => {
  if (action === 'checkout') {
    return {
      token: event.checkoutQrToken,
      expiresAt: event.checkoutQrExpiresAt,
      attendanceCode: event.checkoutAttendanceCode,
    };
  }
  return {
    token: event.checkinQrToken,
    expiresAt: event.checkinQrExpiresAt,
    attendanceCode: event.checkinAttendanceCode,
  };
};

const formatStationQr = (event, action) => {
  const { token, expiresAt, attendanceCode } = getStationCredentials(event, action);
  return {
    action,
    active: isTokenActive(token, expiresAt),
    token: token || '',
    attendanceCode: attendanceCode || '',
    expiresAt: expiresAt || null,
    payload: token ? buildStationPayload(event._id, action, token) : '',
  };
};

const getStationQrCodes = async (user, eventId) => {
  const event = await assertCanManageEventQr(user, eventId);
  return {
    eventId: String(event._id),
    checkin: formatStationQr(event, 'checkin'),
    checkout: formatStationQr(event, 'checkout'),
  };
};

const generateStationQr = async (user, eventId, body = {}) => {
  const event = await assertCanManageEventQr(user, eventId);
  if (QR_BLOCKED_STATUSES.has(event.status)) {
    throw new AppError('Chỉ có thể tạo mã QR khi sự kiện đã được duyệt.', 400);
  }
  const action = body.action === 'checkout' ? 'checkout' : 'checkin';
  const token = crypto.randomBytes(24).toString('hex');
  const attendanceCode = await generateUniqueAttendanceCode();
  const expiresAt = resolveQrExpiresAt(body);

  if (action === 'checkout') {
    event.checkoutQrToken = token;
    event.checkoutQrExpiresAt = expiresAt;
    event.checkoutAttendanceCode = attendanceCode;
  } else {
    event.checkinQrToken = token;
    event.checkinQrExpiresAt = expiresAt;
    event.checkinAttendanceCode = attendanceCode;
  }

  // Đánh dấu ngày hôm nay là một ngày BTC đã mở điểm danh (dùng cho bảng điểm danh theo ngày).
  const openDayKey = localSessionKey(new Date());
  if (!Array.isArray(event.attendanceOpenDays)) event.attendanceOpenDays = [];
  if (!event.attendanceOpenDays.includes(openDayKey)) {
    event.attendanceOpenDays.push(openDayKey);
    event.attendanceOpenDays.sort();
    event.markModified('attendanceOpenDays');
  }
  await event.save();

  const station = formatStationQr(event, action);
  return {
    message: action === 'checkout' ? 'Đã tạo mã QR check-out.' : 'Đã tạo mã QR check-in.',
    ...station,
  };
};

const formatRegistrationScan = (reg) => ({
  id: String(reg._id),
  status: reg.status,
  checkedInAt: reg.checkedInAt || null,
  checkedOutAt: reg.checkedOutAt || null,
  student: reg.user ? { fullname: reg.user.fullname, email: reg.user.email, studentId: reg.user.studentId || '' } : null,
});

const validateStationToken = (event, action, token) => {
  const { token: storedToken, expiresAt } = getStationCredentials(event, action);
  if (!storedToken || storedToken !== token) throw new AppError('Mã QR không hợp lệ hoặc đã hết hạn.', 400);
  if (!isTokenActive(storedToken, expiresAt)) throw new AppError('Mã QR đã hết hạn. Vui lòng yêu cầu BTC tạo mã mới.', 400);
};

const validateStationCode = (event, action, code) => {
  const normalized = normalizeAttendanceCode(code);
  const { token, expiresAt, attendanceCode } = getStationCredentials(event, action);
  if (!attendanceCode || attendanceCode !== normalized) {
    throw new AppError('Mã điểm danh không hợp lệ hoặc đã hết hạn.', 400);
  }
  if (!isTokenActive(token, expiresAt)) {
    throw new AppError('Mã điểm danh đã hết hạn. Vui lòng yêu cầu BTC tạo mã mới.', 400);
  }
};

// Khóa phiên điểm danh theo NGÀY quét (giờ địa phương) — hỗ trợ sự kiện nhiều ngày.
const localSessionKey = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const applySelfScanRegistration = async (user, event, action) => {
  const registration = await EventRegistration.findOne({ user: user._id, event: event._id }).populate('user', 'fullname email studentId');
  if (!registration) throw new AppError('Bạn chưa đăng ký sự kiện này.', 404);
  if (registration.status === 'cancelled') throw new AppError('Vé đã bị hủy — không thể check-in.', 400);

  const eventInfo = { id: String(event._id), title: event.title || '' };
  const now = new Date();
  const sessionKey = localSessionKey(now);
  if (!Array.isArray(registration.attendanceLog)) registration.attendanceLog = [];
  let session = registration.attendanceLog.find((s) => s.sessionKey === sessionKey);

  if (action === 'checkin') {
    if (session && session.checkedInAt) {
      return {
        message: 'Bạn đã check-in hôm nay rồi.',
        event: eventInfo,
        registration: formatRegistrationScan(registration),
        duplicate: true,
      };
    }
    if (session) {
      session.checkedInAt = now;
    } else {
      registration.attendanceLog.push({ sessionKey, checkedInAt: now, checkedOutAt: null });
    }
    registration.markModified('attendanceLog');
    registration.status = 'attended';
    registration.checkedInAt = registration.checkedInAt || now; // lần check-in đầu tiên (tổng hợp)
    await registration.save();
    return {
      message: 'Check-in thành công!',
      event: eventInfo,
      registration: formatRegistrationScan(registration),
    };
  }

  // Check-out: bắt buộc đã check-in TRONG NGÀY hôm nay.
  if (!session || !session.checkedInAt) {
    throw new AppError('Bạn chưa check-in hôm nay — không thể check-out.', 400);
  }
  if (session.checkedOutAt) {
    return {
      message: 'Bạn đã check-out hôm nay rồi.',
      event: eventInfo,
      registration: formatRegistrationScan(registration),
      duplicate: true,
    };
  }
  session.checkedOutAt = now;
  registration.markModified('attendanceLog');
  registration.checkedOutAt = now; // lần check-out gần nhất (tổng hợp)
  await registration.save();
  // Gửi mail cảm ơn mỗi lần check-out (không chặn phản hồi nếu email lỗi).
  const attendeeEmail = registration.user?.email;
  if (attendeeEmail) {
    emailService
      .sendEventCheckoutThankYouEmail({
        to: attendeeEmail,
        fullname: registration.user?.fullname || '',
        eventTitle: event.title || '',
        eventId: String(event._id),
      })
      .catch((err) => console.warn('[checkout] thank-you email failed:', err.message));
  }
  return {
    message: 'Check-out thành công!',
    event: eventInfo,
    registration: formatRegistrationScan(registration),
  };
};

const performSelfScan = async (user, eventId, body = {}) => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) throw new AppError('Không tìm thấy sự kiện.', 404);

  const action = body.action === 'checkout' ? 'checkout' : 'checkin';
  const token = String(body.token || '').trim();
  const code = normalizeAttendanceCode(body.code || '');

  if (code) {
    if (!isValidAttendanceCodeFormat(code)) throw new AppError('Mã điểm danh phải gồm 6 ký tự chữ và số.', 400);
    validateStationCode(event, action, code);
  } else if (token) {
    validateStationToken(event, action, token);
  } else {
    throw new AppError('Mã QR hoặc mã điểm danh không hợp lệ.', 400);
  }

  return applySelfScanRegistration(user, event, action);
};

const findEventByAttendanceCode = async (code, action, user) => {
  const normalized = normalizeAttendanceCode(code);
  const field = action === 'checkout' ? 'checkoutAttendanceCode' : 'checkinAttendanceCode';
  const events = await Event.find({ [field]: normalized, isDeleted: false });

  const activeEvents = events.filter((event) => {
    try {
      validateStationCode(event, action, normalized);
      return true;
    } catch {
      return false;
    }
  });

  if (activeEvents.length === 0) {
    throw new AppError('Mã điểm danh không hợp lệ hoặc đã hết hạn.', 400);
  }

  if (activeEvents.length === 1) return activeEvents[0];

  const registeredEvents = [];
  for (const event of activeEvents) {
    const registration = await EventRegistration.findOne({ user: user._id, event: event._id });
    if (registration && registration.status !== 'cancelled') registeredEvents.push(event);
  }

  if (registeredEvents.length === 1) return registeredEvents[0];

  throw new AppError('Mã điểm danh không xác định được sự kiện. Vui lòng liên hệ ban tổ chức.', 400);
};

const performSelfScanByCode = async (user, body = {}) => {
  const action = body.action === 'checkout' ? 'checkout' : 'checkin';
  const code = normalizeAttendanceCode(body.code || '');

  if (!isValidAttendanceCodeFormat(code)) {
    throw new AppError('Mã điểm danh phải gồm 6 ký tự chữ và số.', 400);
  }

  const event = await findEventByAttendanceCode(code, action, user);
  return applySelfScanRegistration(user, event, action);
};

module.exports = {
  getStationQrCodes,
  generateStationQr,
  performSelfScan,
  performSelfScanByCode,
};
