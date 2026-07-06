const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const AppError = require('../utils/AppError');
const {
  calculateTicketAmount,
  getListPrice,
  hasStudentTicketPrivilege,
  formatVnd,
  enrichEventWithPricing,
} = require('../constants/eventPricing');
const { isEventPubliclyVisible } = require('../constants/eventWorkflow');
const {
  syncEventToGoogleCalendar,
  removeEventFromGoogleCalendar,
} = require('./calendar.service');

const formatEventForMyEvents = (registration) => {
  const event = registration.event;
  if (!event || typeof event !== 'object') return null;

  const start = new Date(event.startDate);
  const dateLabel = Number.isNaN(start.getTime())
    ? ''
    : `${start.toLocaleDateString('vi-VN')} • ${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

  const statusLabels = {
    registered: 'Đã xác nhận',
    attended: 'Đã tham gia',
    cancelled: 'Đã hủy',
  };

  return {
    id: registration._id,
    eventId: event._id,
    title: event.title,
    date: dateLabel,
    location: event.location,
    status: statusLabels[registration.status] || registration.status,
    image: event.thumbnail,
    category: event.category,
    registrationStatus: registration.status,
    registeredAt: registration.registeredAt,
    startDate: event.startDate,
    endDate: event.endDate,
    amountPaid: registration.amountPaid ?? 0,
    listPrice: registration.listPrice ?? 0,
    studentPrivilegeApplied: registration.studentPrivilegeApplied === true,
  };
};

const assertEventRegisterable = (event) => {
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (!isEventPubliclyVisible(event)) {
    throw new AppError('Sự kiện chưa được mở đăng ký.', 400);
  }
  if (event.eventState === 'expired') {
    throw new AppError('Sự kiện đã hết hạn đăng ký.', 400);
  }
  if (event.eventState === 'postponed') {
    throw new AppError('Sự kiện đang hoãn, chưa thể đăng ký.', 400);
  }
  if (event.registrationStartDate) {
    const regStart = new Date(event.registrationStartDate);
    if (!Number.isNaN(regStart.getTime()) && Date.now() < regStart.getTime()) {
      throw new AppError('Sự kiện chưa tới ngày mở đăng ký.', 400);
    }
  }
  if (event.registrationEndDate) {
    const regEnd = new Date(event.registrationEndDate);
    if (!Number.isNaN(regEnd.getTime()) && Date.now() > regEnd.getTime()) {
      throw new AppError('Đã hết hạn đăng ký sự kiện.', 400);
    }
  }
  if (event.registeredCount >= event.capacity) {
    throw new AppError('Sự kiện đã hết chỗ.', 400);
  }
};

const registerForEvent = async (user, eventId) => {
  const event = await Event.findById(eventId);
  assertEventRegisterable(event);

  const listPrice = getListPrice(event);
  const amountPaid = calculateTicketAmount(user, event);
  const studentPrivilegeApplied = listPrice > 0 && amountPaid === 0 && hasStudentTicketPrivilege(user);

  // Vé có phí phải đi qua luồng thanh toán (checkout) — không cho đăng ký trực tiếp
  if (amountPaid > 0) {
    const err = new AppError('Vé này cần thanh toán. Vui lòng dùng chức năng mua vé.', 402);
    err.extra = { code: 'PAYMENT_REQUIRED' };
    throw err;
  }

  let registration = await EventRegistration.findOne({ user: user._id, event: eventId });

  if (registration?.status === 'registered') {
    throw new AppError('Bạn đã đăng ký sự kiện này rồi.', 409);
  }

  const pricingFields = {
    listPrice,
    amountPaid,
    studentPrivilegeApplied,
  };

  if (registration?.status === 'cancelled') {
    registration.status = 'registered';
    registration.registeredAt = new Date();
    registration.cancelledAt = null;
    Object.assign(registration, pricingFields);
    await registration.save();
  } else {
    registration = await EventRegistration.create({
      user: user._id,
      event: eventId,
      status: 'registered',
      ...pricingFields,
    });
  }

  event.registeredCount = Math.min(event.registeredCount + 1, event.capacity);
  await event.save();

  const googleCalendarEventId = await syncEventToGoogleCalendar(user._id, event);
  if (googleCalendarEventId) {
    registration.googleCalendarEventId = googleCalendarEventId;
    await registration.save();
  }

  registration = await EventRegistration.findById(registration._id)
    .populate('event', 'title startDate endDate location thumbnail category capacity registeredCount ticketPrice');

  invalidateRegisteredIdsCache(user._id);

  let message = 'Đăng ký sự kiện thành công!';
  if (studentPrivilegeApplied) {
    message = 'Đăng ký thành công! Bạn được miễn phí vé.';
  } else if (amountPaid > 0) {
    message = `Mua vé thành công (${formatVnd(amountPaid)}). Vé điện tử đã được xác nhận.`;
  }

  const eventDoc = registration.event?.toObject
    ? registration.event.toObject()
    : registration.event;

  return {
    message,
    registration: formatEventForMyEvents(registration),
    event: enrichEventWithPricing({ ...eventDoc, isRegistered: true }, user),
    calendarSynced: Boolean(googleCalendarEventId),
    amountPaid,
    listPrice,
    studentPrivilegeApplied,
  };
};

const cancelRegistration = async (userId, eventId) => {
  const registration = await EventRegistration.findOne({
    user: userId,
    event: eventId,
    status: 'registered',
  });

  if (!registration) {
    throw new AppError('Bạn chưa đăng ký sự kiện này.', 404);
  }

  const { googleCalendarEventId } = registration;

  registration.status = 'cancelled';
  registration.cancelledAt = new Date();
  registration.googleCalendarEventId = null;
  await registration.save();

  await removeEventFromGoogleCalendar(userId, googleCalendarEventId);

  const event = await Event.findById(eventId);
  if (event) {
    event.registeredCount = Math.max(0, event.registeredCount - 1);
    await event.save();
  }

  invalidateRegisteredIdsCache(userId);

  return { message: 'Đã hủy đăng ký sự kiện.' };
};

const registeredIdsCache = new Map();
const REGISTERED_IDS_TTL_MS = 60_000;

const readRegisteredIdsCache = (userId) => {
  const entry = registeredIdsCache.get(String(userId));
  if (!entry) return null;
  if (Date.now() - entry.ts > REGISTERED_IDS_TTL_MS) {
    registeredIdsCache.delete(String(userId));
    return null;
  }
  return entry.ids;
};

const writeRegisteredIdsCache = (userId, ids) => {
  registeredIdsCache.set(String(userId), { ids, ts: Date.now() });
};

const invalidateRegisteredIdsCache = (userId) => {
  if (userId) registeredIdsCache.delete(String(userId));
};

const getRegisteredEventIds = async (userId) => {
  const cached = readRegisteredIdsCache(userId);
  if (cached) return cached;

  const registrations = await EventRegistration.find({
    user: userId,
    status: 'registered',
  })
    .select('event')
    .lean();

  const ids = registrations.map((r) => String(r.event));
  writeRegisteredIdsCache(userId, ids);
  return ids;
};

const getMyEvents = async (userId, { tab = 'upcoming' } = {}) => {
  const now = new Date();

  const registrations = await EventRegistration.find({ user: userId })
    .populate('event')
    .sort({ registeredAt: -1 });

  const mapped = registrations
    .map(formatEventForMyEvents)
    .filter(Boolean);

  if (tab === 'cancelled') {
    return { events: mapped.filter((e) => e.registrationStatus === 'cancelled') };
  }

  if (tab === 'attended') {
    return {
      events: mapped.filter(
        (e) =>
          e.registrationStatus === 'attended' ||
          (e.registrationStatus === 'registered' && new Date(e.endDate) < now)
      ),
    };
  }

  // upcoming
  return {
    events: mapped.filter(
      (e) =>
        e.registrationStatus === 'registered' && new Date(e.endDate) >= now
    ),
  };
};

module.exports = {
  registerForEvent,
  cancelRegistration,
  getRegisteredEventIds,
  getMyEvents,
};
