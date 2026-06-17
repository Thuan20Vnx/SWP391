const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');
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
const { normalizeLearningOutcomes } = require('../utils/learningOutcomes');
const { findClubManagedBy, findManagedClubs, resolveManagedClub } = require('./club.service');

/** Trạng thái chờ duyệt (đồng bộ với luồng CTSV / CLB) */
const PENDING_EVENT_STATUSES = ['pending', 'pending_ctsv', 'pending_icpdp', 'pending_admin', 'revision'];
const CLUB_ADMIN_APPROVE_STATUS = 'pending_admin';

const buildProposalPayloadFromEvent = (event, managedClub, userEmail) => ({
  title: event.title,
  description: event.description || '',
  learningOutcomes: Array.isArray(event.learningOutcomes) ? event.learningOutcomes : [],
  category: event.category,
  startDate: event.startDate,
  endDate: event.endDate || null,
  location: event.location || '',
  totalTickets: event.totalTickets || event.capacity || 100,
  ticketPrice: event.ticketPrice ?? 0,
  ticketTypes: event.ticketTypes || [],
  expectedAttendees: event.expectedAttendees ?? 0,
  image: event.thumbnail || event.image || '',
  clubId: managedClub ? String(managedClub._id) : (event.clubId ? String(event.clubId) : ''),
  clubName: managedClub?.name || event.clubName || '',
  submittedByEmail: userEmail || event.createdByEmail || '',
  linkedEventId: event._id,
});

const syncClubEventProposal = async (event, { managedClub, userEmail, proposalStatus = 'pending_icpdp' }) => {
  const payload = {
    ...buildProposalPayloadFromEvent(event, managedClub, userEmail),
    status: proposalStatus,
  };

  if (event.proposalId) {
    await EventProposal.findByIdAndUpdate(event.proposalId, payload);
    return;
  }

  const proposal = await EventProposal.create(payload);
  event.proposalId = proposal._id;
  await event.save();
};

const isClubManagedEvent = (event) => event.source === 'club' || Boolean(event.clubId);

const createEvent = async (user, body, activeClubId = null) => {
  const {
    title,
    description,
    thumbnail,
    category,
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    location,
    capacity,
    ticketPrice,
    ticketTypes,
    speaker,
    agenda,
    learningOutcomes,
  } = body;

  const normalizedTickets = normalizeTicketTypes(ticketTypes);
  const resolvedTicketPrice =
    Math.max(0, Number(ticketPrice) || 0) || deriveTicketPriceFromTypes(normalizedTickets);
  const resolvedCapacity = Math.max(1, Number(capacity) || 0);
  const resolvedTotalTickets =
    totalQtyFromTypes(normalizedTickets) || resolvedCapacity;

  if (!title || !registrationStartDate || !startDate || !location || !capacity) {
    throw new AppError('Vui lòng điền đầy đủ thông tin bắt buộc!', 400);
  }

  const isClubManager = user.role === 'club_manager';
  const managedClub = isClubManager ? await resolveManagedClub(user._id, activeClubId) : null;
  if (!isClubManager && !isValidEventVenue(location)) {
    throw new AppError(
      'Địa điểm không hợp lệ. Chọn một trong: Sảnh tòa Gamma, Sảnh tòa Beta, Tầng 4 tòa Beta, Tầng 5 tòa Alpha.',
      400
    );
  }

  const initialStatus = isClubManager ? 'pending_icpdp' : 'pending';

  const newEvent = await Event.create({
    title,
    description: description || 'Chưa có mô tả',
    thumbnail: thumbnail || undefined,
    category: normalizeEventCategory(category || 'Khác'),
    registrationStartDate: registrationStartDate || null,
    registrationEndDate: registrationEndDate || null,
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
    createdByEmail: user.email || '',
    clubId: managedClub?._id || null,
    source: 'club',
    status: initialStatus,
    speaker: speaker || undefined,
    agenda: agenda || undefined,
    learningOutcomes: normalizeLearningOutcomes(learningOutcomes),
  });

  if (isClubManager) {
    await syncClubEventProposal(newEvent, {
      managedClub,
      userEmail: user.email,
      proposalStatus: 'pending_icpdp',
    });
  }

  return {
    message: isClubManager
      ? 'Đề xuất sự kiện đã gửi IC-PDP duyệt!'
      : 'Đề xuất sự kiện đã được gửi thành công và đang chờ duyệt!',
    event: newEvent,
  };
};

const MY_EVENTS_LIST_FIELDS =
  'title category startDate endDate location capacity registeredCount status eventState rejectionReason moderationReason ticketPrice speaker createdAt updatedAt createdBy';

const getMyEvents = async (user, activeClubId = null) => {
  const query = { createdBy: user._id };

  if (activeClubId && user.role === 'club_manager') {
    const managedClubs = await findManagedClubs(user._id);
    if (managedClubs.length > 1) {
      query.clubId = activeClubId;
    }
  }

  const events = await Event.find(query)
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
  if (event.status !== 'rejected') {
    throw new AppError('Chỉ có thể xóa sự kiện ở trạng thái bị từ chối.', 400);
  }
  await Event.findByIdAndDelete(eventId);
  return { message: 'Đã xóa sự kiện thành công!' };
};

const EDITABLE_CLUB_STATUSES = ['pending', 'rejected', 'revision', 'pending_ctsv', 'pending_icpdp'];

const updateMyEvent = async (eventId, user, body) => {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Không tìm thấy sự kiện!', 404);
  if (String(event.createdBy) !== String(user._id)) {
    throw new AppError('Bạn không có quyền chỉnh sửa sự kiện này!', 403);
  }
  if (!EDITABLE_CLUB_STATUSES.includes(event.status)) {
    throw new AppError('Sự kiện không thể chỉnh sửa ở trạng thái hiện tại.', 400);
  }

  const {
    title,
    description,
    thumbnail,
    category,
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    location,
    capacity,
    ticketPrice,
    ticketTypes,
    speaker,
    agenda,
    learningOutcomes,
  } = body;

  const normalizedTickets = normalizeTicketTypes(ticketTypes);
  const resolvedTicketPrice =
    Math.max(0, Number(ticketPrice) || 0) || deriveTicketPriceFromTypes(normalizedTickets);
  const resolvedCapacity = Math.max(1, Number(capacity) || event.capacity || 100);
  const resolvedTotalTickets = totalQtyFromTypes(normalizedTickets) || resolvedCapacity;

  if (!title || !registrationStartDate || !startDate || !location || !capacity) {
    throw new AppError('Vui lòng điền đầy đủ thông tin bắt buộc!', 400);
  }

  event.title = title;
  event.description = description || 'Chưa có mô tả';
  if (thumbnail) event.thumbnail = thumbnail;
  event.category = normalizeEventCategory(category || event.category);
  event.registrationStartDate = registrationStartDate || null;
  event.registrationEndDate = registrationEndDate || null;
  event.startDate = startDate;
  event.endDate = endDate;
  event.location = location;
  event.capacity = resolvedCapacity;
  event.totalTickets = resolvedTotalTickets;
  event.ticketPrice = resolvedTicketPrice;
  if (normalizedTickets.length) event.ticketTypes = normalizedTickets;
  if (speaker !== undefined) event.speaker = speaker;
  if (agenda !== undefined) event.agenda = agenda;
  if (learningOutcomes !== undefined) {
    event.learningOutcomes = normalizeLearningOutcomes(learningOutcomes);
  }
  if (event.status === 'rejected') {
    event.status = 'pending_icpdp';
    event.rejectionReason = '';
    event.moderationReason = '';
  }

  await event.save();

  if (isClubManagedEvent(event)) {
    const managedClub = await resolveManagedClub(
      user._id,
      event.clubId ? String(event.clubId) : null
    );
    await syncClubEventProposal(event, {
      managedClub,
      userEmail: user.email,
      proposalStatus: 'pending_icpdp',
    });
  }

  return {
    message: 'Đã cập nhật đề xuất sự kiện và gửi lại duyệt!',
    event,
  };
};

const getPendingEvents = async () => {
  const events = await Event.find({ status: { $in: PENDING_EVENT_STATUSES } })
    .populate('createdBy', 'fullname email studentId')
    .sort({ createdAt: -1 });

  return { events };
};

const updateEventStatus = async (eventId, { status, rejectionReason, authEmail }) => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('Trạng thái không hợp lệ!', 400);
  }

  const event = await Event.findById(eventId);

  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  if (isClubManagedEvent(event)) {
    if (status === 'approved') {
      if (event.status === 'pending_icpdp') {
        throw new AppError('Sự kiện CLB cần IC-PDP duyệt trước, sau đó Admin phê duyệt.', 400);
      }
      if (event.status !== CLUB_ADMIN_APPROVE_STATUS) {
        throw new AppError('Chỉ phê duyệt sự kiện CLB khi đang chờ Admin duyệt.', 400);
      }
    } else if (!PENDING_EVENT_STATUSES.includes(event.status)) {
      throw new AppError('Sự kiện không ở trạng thái chờ duyệt!', 400);
    }
  } else if (!PENDING_EVENT_STATUSES.includes(event.status)) {
    throw new AppError('Sự kiện không ở trạng thái chờ duyệt!', 400);
  }

  event.status = status;
  if (status === 'approved') {
    event.approvedByEmail = authEmail || event.approvedByEmail || '';
    if (isClubManagedEvent(event)) {
      event.adminApprovedByEmail = authEmail || '';
      event.adminApprovedAt = new Date();
    }
  }
  if (status === 'rejected' && rejectionReason) {
    event.rejectionReason = rejectionReason;
  }

  await event.save();

  if (isClubManagedEvent(event) && event.proposalId) {
    const proposalUpdate = {
      status: status === 'approved' ? 'approved' : 'rejected',
    };
    if (status === 'rejected' && rejectionReason) {
      proposalUpdate.rejectionReason = rejectionReason;
    }
    if (status === 'approved') {
      proposalUpdate.eventId = event._id;
    }
    await EventProposal.findByIdAndUpdate(event.proposalId, proposalUpdate);
  }

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
    .select('-thumbnail -image -banner')
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

const getEventById = async (eventId, { user, activeClubId } = {}) => {
  const event = await Event.findById(eventId).populate(
    'createdBy',
    'fullname email studentId role'
  );

  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const isOwner = user?._id && String(event.createdBy?._id || event.createdBy) === String(user._id);
  let canManage = isOwner;
  if (!canManage && user?.role === 'club_manager' && event.clubId) {
    const club = await resolveManagedClub(user._id, activeClubId);
    if (club && String(event.clubId) === String(club._id)) {
      canManage = true;
    }
  }
  const isPublic = SCHOOL_EVENT_PUBLIC_STATUSES.includes(event.status) && event.isHidden !== true;

  if (!isPublic && !canManage) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const [registeredCount, checkinCount, registrations] = await Promise.all([
    EventRegistration.countDocuments({ event: eventId, status: { $ne: 'cancelled' } }),
    EventRegistration.countDocuments({ event: eventId, status: 'attended' }),
    canManage
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
  doc.rating = doc.averageRating ?? 0;
  doc.ratingCount = doc.reviewCount ?? 0;
  doc.averageRating = doc.averageRating ?? 0;
  doc.reviewCount = doc.reviewCount ?? 0;

  if (user?._id) {
    const ids = await getRegisteredEventIds(user._id);
    doc.isRegistered = ids.includes(String(event._id));
  } else {
    doc.isRegistered = false;
  }

  if (canManage && doc.source === 'club') {
    const ownerId = event.createdBy?._id || event.createdBy;
    const club = await resolveManagedClub(user._id, activeClubId)
      || (ownerId ? await resolveManagedClub(ownerId, activeClubId) : null);
    if (club) {
      doc.clubName = club.name || '';
      doc.clubPresident = club.president || event.createdBy?.fullname || user.fullname || '';
    } else {
      doc.clubName = doc.clubName || '';
      doc.clubPresident = event.createdBy?.fullname || user.fullname || '';
    }
  }

  const students = registrations.map((r) => ({
    _id: r._id,
    status: r.status === 'attended' ? 'checked-in' : r.status,
    createdAt: r.createdAt,
    cancelledAt: r.cancelledAt || null,
    checkedInAt: r.checkedInAt || null,
    checkedOutAt: r.checkedOutAt || null,
    student: r.user,
  }));

  return {
    event: enrichEventWithPricing(doc, user),
    students: canManage ? students : undefined,
  };
};

module.exports = {
  createEvent,
  getMyEvents,
  deleteMyEvent,
  updateMyEvent,
  getPendingEvents,
  updateEventStatus,
  getApprovedEvents,
  getEventById,
  syncClubEventProposal,
  isClubManagedEvent,
};
