const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const AppError = require('../utils/AppError');
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
  };
};

const assertEventRegisterable = (event) => {
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (event.status !== 'approved') {
    throw new AppError('Sự kiện chưa được phê duyệt.', 400);
  }
  if (event.eventState === 'expired') {
    throw new AppError('Sự kiện đã hết hạn đăng ký.', 400);
  }
  if (event.eventState === 'postponed') {
    throw new AppError('Sự kiện đang hoãn, chưa thể đăng ký.', 400);
  }
  if (event.registeredCount >= event.capacity) {
    throw new AppError('Sự kiện đã hết chỗ.', 400);
  }
};

const registerForEvent = async (userId, eventId) => {
  const event = await Event.findById(eventId);
  assertEventRegisterable(event);

  let registration = await EventRegistration.findOne({ user: userId, event: eventId });

  if (registration?.status === 'registered') {
    throw new AppError('Bạn đã đăng ký sự kiện này rồi.', 409);
  }

  if (registration?.status === 'cancelled') {
    registration.status = 'registered';
    registration.registeredAt = new Date();
    registration.cancelledAt = null;
    await registration.save();
  } else {
    registration = await EventRegistration.create({
      user: userId,
      event: eventId,
      status: 'registered',
    });
  }

  event.registeredCount = Math.min(event.registeredCount + 1, event.capacity);
  await event.save();

  const googleCalendarEventId = await syncEventToGoogleCalendar(userId, event);
  if (googleCalendarEventId) {
    registration.googleCalendarEventId = googleCalendarEventId;
    await registration.save();
  }

  registration = await EventRegistration.findById(registration._id)
    .populate('event', 'title startDate endDate location thumbnail category capacity registeredCount');

  return {
    message: 'Đăng ký sự kiện thành công!',
    registration: formatEventForMyEvents(registration),
    event: registration.event,
    calendarSynced: Boolean(googleCalendarEventId),
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

  return { message: 'Đã hủy đăng ký sự kiện.' };
};

const getRegisteredEventIds = async (userId) => {
  const registrations = await EventRegistration.find({
    user: userId,
    status: 'registered',
  }).select('event');

  return registrations.map((r) => String(r.event));
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
