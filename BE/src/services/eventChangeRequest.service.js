const Event = require('../models/Event');
const EventChangeRequest = require('../models/EventChangeRequest');
const { normalizeEventCategory } = require('../constants/eventCategories');
const { formatChangeRequest } = require('../utils/eventChangeRequestFormat');
const AppError = require('../utils/AppError');

const buildEventSnapshot = (event) => ({
  title: event.title,
  description: event.description || '',
  location: event.location || '',
  startDate: event.startDate,
  endDate: event.endDate,
  capacity: event.capacity || event.totalTickets,
  category: event.category,
  status: event.status,
  isHidden: event.isHidden === true
});

const listChangeRequests = async ({ status = 'pending', type } = {}) => {
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (type && type !== 'all') filter.requestType = type;

  const rows = await EventChangeRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(200);

  const eventIds = [...new Set(rows.map((r) => String(r.eventId)))];
  const events = await Event.find({ _id: { $in: eventIds } });
  const eventMap = new Map(events.map((e) => [String(e._id), e]));

  return {
    requests: rows.map((r) => formatChangeRequest(r, eventMap.get(String(r.eventId))))
  };
};

const getChangeRequestById = async (id) => {
  const row = await EventChangeRequest.findById(id);
  if (!row) throw new AppError('Không tìm thấy yêu cầu!', 404);
  const event = await Event.findById(row.eventId);
  return { request: formatChangeRequest(row, event) };
};

const applyApprovedChange = async (request, event) => {
  if (request.requestType === 'hide') {
    event.isHidden = true;
    await event.save();
    return;
  }

  if (request.requestType === 'delete') {
    event.isDeleted = true;
    event.isHidden = true;
    event.status = 'ended';
    await event.save();
    return;
  }

  const patch = request.payload || {};
  if (patch.title?.trim()) event.title = patch.title.trim();
  if (patch.description !== undefined) event.description = patch.description;
  if (patch.location?.trim()) event.location = patch.location.trim();
  if (patch.startDate) event.startDate = patch.startDate;
  if (patch.endDate) event.endDate = patch.endDate;
  if (patch.capacity != null) {
    event.capacity = Math.max(0, Number(patch.capacity) || 0);
    event.totalTickets = event.capacity;
  }
  if (patch.category) event.category = normalizeEventCategory(patch.category);
  await event.save();
};

const approveChangeRequest = async (id, { adminNote, processorEmail }) => {
  const request = await EventChangeRequest.findById(id);
  if (!request) throw new AppError('Không tìm thấy yêu cầu!', 404);
  if (request.status !== 'pending') {
    throw new AppError('Yêu cầu đã được xử lý!', 400);
  }

  const event = await Event.findById(request.eventId);
  if (!event) throw new AppError('Sự kiện gốc không tồn tại!', 404);
  if (event.isDeleted) throw new AppError('Sự kiện đã bị xóa!', 400);

  await applyApprovedChange(request, event);

  request.status = 'approved';
  request.adminNote = adminNote || '';
  request.processedByEmail = processorEmail || '';
  await request.save();

  return { request: formatChangeRequest(request, event) };
};

const rejectChangeRequest = async (id, { adminNote, processorEmail }) => {
  const request = await EventChangeRequest.findById(id);
  if (!request) throw new AppError('Không tìm thấy yêu cầu!', 404);
  if (request.status !== 'pending') {
    throw new AppError('Yêu cầu đã được xử lý!', 400);
  }

  request.status = 'rejected';
  request.adminNote = adminNote || '';
  request.processedByEmail = processorEmail || '';
  await request.save();

  const event = await Event.findById(request.eventId);
  return { request: formatChangeRequest(request, event) };
};

const createChangeRequest = async (user, body) => {
  const { eventId, requestType, reason, payload, clubName } = body;

  if (!eventId || !requestType) {
    throw new AppError('Thiếu thông tin yêu cầu!', 400);
  }
  if (!['edit', 'delete', 'hide'].includes(requestType)) {
    throw new AppError('Loại yêu cầu không hợp lệ!', 400);
  }
  if (!reason?.trim()) {
    throw new AppError('Vui lòng nhập lý do yêu cầu!', 400);
  }

  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Không tìm thấy sự kiện!', 404);
  if (event.isDeleted) throw new AppError('Sự kiện đã bị xóa!', 400);

  const pendingExists = await EventChangeRequest.findOne({
    eventId: event._id,
    status: 'pending'
  });
  if (pendingExists) {
    throw new AppError('Đã có yêu cầu đang chờ xử lý cho sự kiện này!', 400);
  }

  const row = await EventChangeRequest.create({
    eventId: event._id,
    requestType,
    reason: reason.trim(),
    payload: requestType === 'edit' ? payload || {} : {},
    snapshot: buildEventSnapshot(event),
    requestedByEmail: user.email,
    requestedByName: user.fullname || '',
    clubName: clubName || ''
  });

  return {
    message: 'Đã gửi yêu cầu. Phòng CTSV/Admin sẽ xử lý sớm nhất.',
    request: formatChangeRequest(row, event)
  };
};

module.exports = {
  listChangeRequests,
  getChangeRequestById,
  approveChangeRequest,
  rejectChangeRequest,
  createChangeRequest
};
