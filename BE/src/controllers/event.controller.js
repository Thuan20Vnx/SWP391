const eventService = require('../services/event.service');

const createEvent = async (req, res) => {
  const result = await eventService.createEvent(req.user, req.body, req.headers['x-managed-club-id']);
  res.status(201).json({ success: true, ...result });
};

const getPendingEvents = async (req, res) => {
  const result = await eventService.getPendingEvents();
  res.status(200).json({ success: true, ...result });
};

const updateEventStatus = async (req, res) => {
  const result = await eventService.updateEventStatus(req.params.id, {
    ...req.body,
    authEmail: req.authEmail,
  });
  res.status(200).json({ success: true, ...result });
};

const getApprovedEvents = async (req, res) => {
  const result = await eventService.getApprovedEvents({
    category: req.query.category,
    search: req.query.search,
    q: req.query.q,
    club: req.query.club,
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
    state: req.query.state,
    organizer: req.query.organizer,
    user: req.user || null,
  });
  res.status(200).json({ success: true, ...result });
};

const getFeaturedEvents = async (req, res) => {
  const limit = Math.min(10, Math.max(1, parseInt(req.query.limit, 10) || 3));
  const result = await eventService.getApprovedEvents({
    page: 1,
    limit,
    sort: 'featured',
    user: req.user || null,
  });
  res.status(200).json({ success: true, ...result });
};

const getEventCover = async (req, res) => {
  await eventService.sendEventCover(req.params.id, res, {
    user: req.user,
    userRole: req.userRole || req.authRole,
    activeClubId: req.headers['x-managed-club-id'],
  });
};

const getEventPlan = async (req, res) => {
  await eventService.sendEventPlan(req.params.id, res, {
    user: req.user || null,
    activeClubId: req.headers['x-managed-club-id'],
  });
};

const getSpeakerAvatar = async (req, res) => {
  await eventService.sendSpeakerAvatar(req.params.id, req.params.index, res);
};

const getEventById = async (req, res) => {
  const result = await eventService.getEventById(req.params.id, {
    user: req.user || null,
    activeClubId: req.headers['x-managed-club-id'],
  });
  const payload = { success: true, event: result.event };
  if (result.students) {
    payload.students = result.students;
  }
  res.status(200).json(payload);
};

const getMyEvents = async (req, res) => {
  const result = await eventService.getMyEvents(req.user, req.headers['x-managed-club-id']);
  res.status(200).json({ success: true, ...result });
};

const deleteMyEvent = async (req, res) => {
  const result = await eventService.deleteMyEvent(req.params.id, req.user);
  res.status(200).json({ success: true, ...result });
};

const updateMyEvent = async (req, res) => {
  const result = await eventService.updateMyEvent(
    req.params.id,
    req.user,
    req.body,
    req.headers['x-managed-club-id']
  );
  res.status(200).json({ success: true, ...result });
};

module.exports = {
  createEvent,
  getMyEvents,
  deleteMyEvent,
  updateMyEvent,
  getPendingEvents,
  updateEventStatus,
  getApprovedEvents,
  getFeaturedEvents,
  getEventCover,
  getEventPlan,
  getSpeakerAvatar,
  getEventById,
};

