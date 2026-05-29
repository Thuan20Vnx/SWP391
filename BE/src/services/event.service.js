const Event = require('../models/Event');
const AppError = require('../utils/AppError');
const { isValidEventVenue } = require('../constants/eventVenues');
const { getRegisteredEventIds } = require('./registration.service');

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
  } = body;

  if (!title || !description || !startDate || !endDate || !location || !capacity) {
    throw new AppError('Vui lòng điền đầy đủ thông tin bắt buộc!', 400);
  }

  if (!isValidEventVenue(location)) {
    throw new AppError(
      'Địa điểm không hợp lệ. Chọn một trong: Sảnh tòa Gamma, Sảnh tòa Beta, Tầng 4 tòa Beta, Tầng 5 tòa Alpha.',
      400
    );
  }

  const newEvent = await Event.create({
    title,
    description,
    thumbnail: thumbnail || undefined,
    category: category || 'Công nghệ',
    startDate,
    endDate,
    location,
    capacity,
    registeredCount: 0,
    eventState: 'active',
    createdBy: user._id,
    status: 'pending',
  });

  return {
    message: 'Đề xuất sự kiện đã được gửi thành công và đang chờ duyệt!',
    event: newEvent,
  };
};

const getPendingEvents = async () => {
  const events = await Event.find({ status: 'pending' })
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

const getApprovedEvents = async ({ category, userId } = {}) => {
  const query = { status: 'approved' };
  if (category && category !== 'all') {
    query.category = category;
  }

  const events = await Event.find(query)
    .populate('createdBy', 'fullname email')
    .sort({ startDate: 1 });

  let registeredSet = new Set();
  if (userId) {
    const ids = await getRegisteredEventIds(userId);
    registeredSet = new Set(ids);
  }

  const eventsWithRegistration = events.map((event) => {
    const doc = event.toObject();
    doc.isRegistered = registeredSet.has(String(event._id));
    return doc;
  });

  return { events: eventsWithRegistration };
};

module.exports = {
  createEvent,
  getPendingEvents,
  updateEventStatus,
  getApprovedEvents,
};
