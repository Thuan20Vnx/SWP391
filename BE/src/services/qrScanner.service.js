const crypto = require('crypto');
const Event = require('../models/Event');
const Club = require('../models/Club');
const EventRegistration = require('../models/EventRegistration');
const AppError = require('../utils/AppError');

const QR_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_QR_DURATION_MINUTES = 7 * 24 * 60;

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

const buildStationPayload = (eventId, action, token) => JSON.stringify({
  type: 'fpt-event-station',
  eventId: String(eventId),
  action,
  token,
});

const formatStationQr = (event, action) => {
  const token = action === 'checkout' ? event.checkoutQrToken : event.checkinQrToken;
  const expiresAt = action === 'checkout' ? event.checkoutQrExpiresAt : event.checkinQrExpiresAt;
  return {
    action,
    active: isTokenActive(token, expiresAt),
    token: token || '',
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
  const action = body.action === 'checkout' ? 'checkout' : 'checkin';
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = resolveQrExpiresAt(body);

  if (action === 'checkout') {
    event.checkoutQrToken = token;
    event.checkoutQrExpiresAt = expiresAt;
  } else {
    event.checkinQrToken = token;
    event.checkinQrExpiresAt = expiresAt;
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
  const storedToken = action === 'checkout' ? event.checkoutQrToken : event.checkinQrToken;
  const expiresAt = action === 'checkout' ? event.checkoutQrExpiresAt : event.checkinQrExpiresAt;
  if (!storedToken || storedToken !== token) throw new AppError('Mã QR không hợp lệ hoặc đã hết hạn.', 400);
  if (!isTokenActive(storedToken, expiresAt)) throw new AppError('Mã QR đã hết hạn. Vui lòng yêu cầu BTC tạo mã mới.', 400);
};

const performSelfScan = async (user, eventId, body = {}) => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) throw new AppError('Không tìm thấy sự kiện.', 404);

  const action = body.action === 'checkout' ? 'checkout' : 'checkin';
  const token = String(body.token || '').trim();
  if (!token) throw new AppError('Mã QR không hợp lệ.', 400);
  validateStationToken(event, action, token);

  const registration = await EventRegistration.findOne({ user: user._id, event: eventId }).populate('user', 'fullname email studentId');
  if (!registration) throw new AppError('Bạn chưa đăng ký sự kiện này.', 404);
  if (registration.status === 'cancelled') throw new AppError('Vé đã bị hủy — không thể check-in.', 400);

  const now = new Date();
  if (action === 'checkin') {
    if (registration.status === 'attended' && registration.checkedInAt) {
      return { message: 'Bạn đã check-in trước đó.', registration: formatRegistrationScan(registration), duplicate: true };
    }
    registration.status = 'attended';
    registration.checkedInAt = registration.checkedInAt || now;
    await registration.save();
    return { message: 'Check-in thành công!', registration: formatRegistrationScan(registration) };
  }

  if (!registration.checkedInAt && registration.status !== 'attended') {
    throw new AppError('Bạn chưa check-in — không thể check-out.', 400);
  }
  registration.checkedOutAt = now;
  await registration.save();
  return { message: 'Check-out thành công!', registration: formatRegistrationScan(registration) };
};

module.exports = {
  getStationQrCodes,
  generateStationQr,
  performSelfScan,
};
