const Event = require('../models/Event');
const AppError = require('../utils/AppError');

const createEvent = async (user, body) => {
  const { title, description, thumbnail, startDate, endDate, location, capacity } = body;

  if (!title || !description || !startDate || !endDate || !location || !capacity) {
    throw new AppError('Vui lòng điền đầy đủ thông tin bắt buộc!', 400);
  }

  const newEvent = await Event.create({
    title,
    description,
    thumbnail: thumbnail || undefined,
    startDate,
    endDate,
    location,
    capacity,
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

const getApprovedEvents = async () => {
  const events = await Event.find({ status: 'approved' })
    .populate('createdBy', 'fullname email')
    .sort({ startDate: 1 });

  return { events };
};

module.exports = {
  createEvent,
  getPendingEvents,
  updateEventStatus,
  getApprovedEvents,
};
