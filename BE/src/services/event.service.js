const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const AppError = require('../utils/AppError');
const { isValidEventVenue } = require('../constants/eventVenues');
const { normalizeEventCategory } = require('../constants/eventCategories');
const { SCHOOL_EVENT_PUBLIC_STATUSES } = require('../constants/eventWorkflow');
const { getRegisteredEventIds } = require('./registration.service');
const { enrichEventWithPricing } = require('../constants/eventPricing');
const {
  normalizeTicketTypes,
  deriveTicketPriceFromTypes,
  totalQtyFromTypes
} = require('../utils/ticketTypes');

/** Trạng thái chờ duyệt (đồng bộ với luồng CTSV / CLB) */
const PENDING_EVENT_STATUSES = ['pending', 'pending_ctsv', 'pending_icpdp', 'revision'];

const createEvent = async (user, body) => {
  const {
    title,
    description,
    thumbnail,
    category,
    startDate,
    endDate,
    location,
    capacity,
    ticketPrice,
    ticketTypes,
    speaker,
    agenda,
  } = body;

  const normalizedTickets = normalizeTicketTypes(ticketTypes);
  const resolvedTicketPrice =
    Math.max(0, Number(ticketPrice) || 0) || deriveTicketPriceFromTypes(normalizedTickets);
  const resolvedCapacity = Math.max(1, Number(capacity) || 0);
  const resolvedTotalTickets =
    totalQtyFromTypes(normalizedTickets) || resolvedCapacity;

  if (!title || !startDate || !location || !capacity) {
    throw new AppError('Vui lòng điền đầy đủ thông tin bắt buộc!', 400);
  }

  const isClubManager = user.role === 'club_manager';
  if (!isClubManager && !isValidEventVenue(location)) {
    throw new AppError(
      'Địa điểm không hợp lệ. Chọn một trong: Sảnh tòa Gamma, Sảnh tòa Beta, Tầng 4 tòa Beta, Tầng 5 tòa Alpha.',
      400
    );
  }

  const newEvent = await Event.create({
    title,
    description: description || 'Chưa có mô tả',
    thumbnail: thumbnail || undefined,
    category: normalizeEventCategory(category || 'Khác'),
    startDate,
    endDate,
    location,
    capacity: resolvedCapacity,
    totalTickets: resolvedTotalTickets,
    ticketPrice: resolvedTicketPrice,
    ticketTypes: normalizedTickets,
    registeredCount: 0,
    eventState: 'active',
    createdBy: user._id,
    status: 'pending',
    speaker: speaker || undefined,
    agenda: agenda || undefined,
  });

  return {
    message: 'Đề xuất sự kiện đã được gửi thành công và đang chờ duyệt!',
    event: newEvent,
  };
};

const MY_EVENTS_LIST_FIELDS =
  'title category startDate endDate location capacity registeredCount status eventState rejectionReason moderationReason ticketPrice speaker createdAt updatedAt createdBy';

const getMyEvents = async (user) => {
  const events = await Event.find({ createdBy: user._id })
    .select(MY_EVENTS_LIST_FIELDS)
    .sort({ createdAt: -1 })
    .lean();
  return { events };
};

const deleteMyEvent = async (eventId, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }
  if (String(event.createdBy) !== String(user._id)) {
    throw new AppError('Bạn không có quyền xóa sự kiện này!', 403);
  }
  await Event.findByIdAndDelete(eventId);
  return { message: 'Đã xóa sự kiện thành công!' };
};

const getPendingEvents = async () => {
  const events = await Event.find({ status: { $in: PENDING_EVENT_STATUSES } })
    .populate('createdBy', 'fullname email studentId')
    .sort({ createdAt: -1 });

  return { events };
};

const updateEventStatus = async (eventId, { status, rejectionReason }) => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('Trạng thái không hợp lệ!', 400);
  }

  const event = await Event.findById(eventId);

  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  if (!PENDING_EVENT_STATUSES.includes(event.status)) {
    throw new AppError('Sự kiện không ở trạng thái chờ duyệt!', 400);
  }

  event.status = status;
  if (status === 'rejected' && rejectionReason) {
    event.rejectionReason = rejectionReason;
  }

  await event.save();

  return {
    message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} sự kiện thành công!`,
    event,
  };
};

const getApprovedEvents = async ({ category, user } = {}) => {
  const query = {
    status: { $in: SCHOOL_EVENT_PUBLIC_STATUSES },
    isHidden: { $ne: true },
    isDeleted: { $ne: true },
  };
  if (category && category !== 'all') {
    query.category = category;
  }

  const events = await Event.find(query)
    .populate('createdBy', 'fullname email')
    .sort({ startDate: 1 })
    .limit(300);

  let registeredSet = new Set();
  if (user?._id) {
    const ids = await getRegisteredEventIds(user._id);
    registeredSet = new Set(ids);
  }

  const eventsWithRegistration = events.map((event) => {
    const doc = event.toObject();
    doc.isRegistered = registeredSet.has(String(event._id));
    return enrichEventWithPricing(doc, user);
  });

  return { events: eventsWithRegistration };
};

const getEventById = async (eventId, { user } = {}) => {
  const event = await Event.findById(eventId).populate('createdBy', 'fullname email studentId role');

  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const isOwner = user?._id && String(event.createdBy?._id || event.createdBy) === String(user._id);
  const isPublic = SCHOOL_EVENT_PUBLIC_STATUSES.includes(event.status) && event.isHidden !== true;

  if (!isPublic && !isOwner) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const [registeredCount, checkinCount, registrations] = await Promise.all([
    EventRegistration.countDocuments({ event: eventId, status: { $ne: 'cancelled' } }),
    EventRegistration.countDocuments({ event: eventId, status: 'attended' }),
    isOwner
      ? EventRegistration.find({ event: eventId })
          .populate('user', 'fullname studentId email')
          .sort({ registeredAt: -1 })
          .limit(200)
      : Promise.resolve([])
  ]);

  const doc = event.toObject();
  doc.registeredCount = registeredCount;
  doc.checkinCount = checkinCount;
  doc.reach = doc.reach || 0;
  doc.rating = doc.rating || 0;
  doc.ratingCount = doc.ratingCount || 0;

  if (user?._id) {
    const ids = await getRegisteredEventIds(user._id);
    doc.isRegistered = ids.includes(String(event._id));
  } else {
    doc.isRegistered = false;
  }

  const students = registrations.map((r) => ({
    _id: r._id,
    status: r.status === 'attended' ? 'checked-in' : r.status,
    createdAt: r.createdAt,
    student: r.user,
  }));

  return {
    event: enrichEventWithPricing(doc, user),
    students: isOwner ? students : undefined,
  };
};

module.exports = {
  createEvent,
  getMyEvents,
  deleteMyEvent,
  getPendingEvents,
  updateEventStatus,
  getApprovedEvents,
  getEventById,
};
