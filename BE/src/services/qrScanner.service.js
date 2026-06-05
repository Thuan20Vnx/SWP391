const Event = require('../models/Event');
const User = require('../models/User');
const Club = require('../models/Club');
const QrScannerGrant = require('../models/QrScannerGrant');
const EventRegistration = require('../models/EventRegistration');
const AppError = require('../utils/AppError');
const { formatScannerGrant, isGrantActive } = require('../utils/qrScannerFormat');

const resolveManagedClub = async (userId) => {
  let club = await Club.findOne({ managedBy: userId });
  if (!club) {
    const { MANAGED_CLUB_SLUG } = require('./club.service');
    club = await Club.findOne({ slug: MANAGED_CLUB_SLUG });
  }
  return club;
};

const canUserGrantForEvent = async (user, event) => {
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

const assertCanGrant = async (user, eventId) => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) throw new AppError('Không tìm thấy sự kiện.', 404);
  if (!(await canUserGrantForEvent(user, event))) {
    throw new AppError('Bạn không có quyền cấp quyền quét QR cho sự kiện này.', 403);
  }
  return event;
};

const resolveScannerUser = async (payload = {}) => {
  const email = String(payload.email || payload.scannerEmail || '').trim().toLowerCase();
  const studentId = String(payload.studentId || payload.mssv || '').trim();
  if (!email && !studentId) throw new AppError('Vui lòng nhập email hoặc MSSV sinh viên.', 400);
  let user = null;
  if (email) user = await User.findOne({ email });
  if (!user && studentId) user = await User.findOne({ studentId });
  if (!user) throw new AppError('Không tìm thấy sinh viên với thông tin đã nhập.', 404);
  if (!['student', 'staff'].includes(user.role)) {
    throw new AppError('Chỉ có thể cấp quyền quét QR cho sinh viên hoặc cán bộ.', 400);
  }
  if (String(user._id) === String(payload.granterId)) {
    throw new AppError('Không thể tự cấp quyền quét QR cho chính mình.', 400);
  }
  return user;
};

const parseValidity = (body = {}) => {
  const validityType = body.validityType || 'permanent';
  if (!['permanent', 'until', 'duration'].includes(validityType)) {
    throw new AppError('Loại hiệu lực không hợp lệ.', 400);
  }
  let validUntil = null;
  let durationMinutes = null;
  if (validityType === 'until') {
    validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (!validUntil || Number.isNaN(validUntil.getTime())) throw new AppError('Vui lòng chọn ngày giờ hết hiệu lực.', 400);
    if (validUntil <= new Date()) throw new AppError('Thời điểm hết hiệu lực phải ở tương lai.', 400);
  }
  if (validityType === 'duration') {
    durationMinutes = Math.max(1, Math.round(Number(body.durationMinutes) || 0));
    if (!durationMinutes) throw new AppError('Vui lòng nhập thời lượng hiệu lực (phút).', 400);
  }
  return { validityType, validUntil, durationMinutes };
};

const listGrantsForEvent = async (user, eventId) => {
  await assertCanGrant(user, eventId);
  const grants = await QrScannerGrant.find({ event: eventId, revokedAt: null })
    .populate('scannerUser', 'fullname email studentId')
    .sort({ createdAt: -1 });
  const formatted = grants.map((g) => formatScannerGrant(g));
  return { grants: formatted.filter((g) => g.active), allGrants: formatted };
};

const createGrant = async (user, eventId, body = {}) => {
  const event = await assertCanGrant(user, eventId);
  const scannerUser = await resolveScannerUser({ ...body, granterId: user._id });
  const { validityType, validUntil, durationMinutes } = parseValidity(body);
  const existing = await QrScannerGrant.findOne({ event: eventId, scannerUser: scannerUser._id, revokedAt: null });
  if (existing && isGrantActive(existing)) {
    throw new AppError('Sinh viên này đã được cấp quyền quét QR cho sự kiện.', 400);
  }
  const grant = await QrScannerGrant.create({
    event: event._id,
    scannerUser: scannerUser._id,
    grantedBy: user._id,
    grantedByRole: user.role === 'admin' ? 'admin' : user.role,
    validityType,
    validUntil,
    durationMinutes,
    note: String(body.note || '').slice(0, 300),
  });
  await grant.populate('scannerUser', 'fullname email studentId');
  return { message: 'Đã cấp quyền quét QR cho sinh viên.', grant: formatScannerGrant(grant) };
};

const revokeGrant = async (user, eventId, grantId) => {
  await assertCanGrant(user, eventId);
  const grant = await QrScannerGrant.findOne({ _id: grantId, event: eventId, revokedAt: null });
  if (!grant) throw new AppError('Không tìm thấy quyền quét QR.', 404);
  grant.revokedAt = new Date();
  await grant.save();
  return { message: 'Đã thu hồi quyền quét QR.' };
};

const getActiveGrantForUser = async (userId, eventId) => {
  const grants = await QrScannerGrant.find({ event: eventId, scannerUser: userId, revokedAt: null }).sort({ createdAt: -1 });
  return grants.find((g) => isGrantActive(g)) || null;
};

const listMyScannerEvents = async (userId) => {
  const grants = await QrScannerGrant.find({ scannerUser: userId, revokedAt: null })
    .populate({ path: 'event', select: 'title startDate endDate location status source thumbnail' })
    .sort({ createdAt: -1 });
  return {
    events: grants.filter((g) => isGrantActive(g) && g.event).map((g) => ({ grant: formatScannerGrant(g), event: g.event })),
  };
};

const formatRegistrationScan = (reg) => ({
  id: String(reg._id),
  status: reg.status,
  checkedInAt: reg.checkedInAt || null,
  checkedOutAt: reg.checkedOutAt || null,
  student: reg.user ? { fullname: reg.user.fullname, email: reg.user.email, studentId: reg.user.studentId || '' } : null,
});

const performScan = async (user, eventId, body = {}) => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) throw new AppError('Không tìm thấy sự kiện.', 404);
  const grant = await getActiveGrantForUser(user._id, eventId);
  const isOrganizer = (await canUserGrantForEvent(user, event)) || String(event.createdBy) === String(user._id);
  if (!grant && !isOrganizer && !['ctsv', 'admin', 'icpdp'].includes(user.role)) {
    throw new AppError('Bạn chưa được cấp quyền quét QR cho sự kiện này.', 403);
  }
  const registrationId = body.registrationId || body.token;
  if (!registrationId) throw new AppError('Mã QR không hợp lệ.', 400);
  const registration = await EventRegistration.findOne({ _id: registrationId, event: eventId }).populate('user', 'fullname email studentId');
  if (!registration) throw new AppError('Không tìm thấy đăng ký tương ứng với mã QR.', 404);
  if (registration.status === 'cancelled') throw new AppError('Vé đã bị hủy — không thể quét.', 400);
  const action = body.action === 'checkout' ? 'checkout' : 'checkin';
  const now = new Date();
  if (action === 'checkin') {
    if (registration.status === 'attended') {
      return { message: 'Sinh viên đã check-in trước đó.', registration: formatRegistrationScan(registration), duplicate: true };
    }
    registration.status = 'attended';
    registration.checkedInAt = registration.checkedInAt || now;
    registration.scannedBy = user._id;
    await registration.save();
    return { message: `Check-in thành công: ${registration.user?.fullname || 'Sinh viên'}.`, registration: formatRegistrationScan(registration) };
  }
  if (!registration.checkedInAt && registration.status !== 'attended') {
    throw new AppError('Sinh viên chưa check-in — không thể check-out.', 400);
  }
  registration.checkedOutAt = now;
  await registration.save();
  return { message: `Check-out thành công: ${registration.user?.fullname || 'Sinh viên'}.`, registration: formatRegistrationScan(registration) };
};

module.exports = {
  listGrantsForEvent,
  createGrant,
  revokeGrant,
  listMyScannerEvents,
  performScan,
};
