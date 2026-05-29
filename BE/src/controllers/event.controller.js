const eventService = require('../services/event.service');

const createEvent = async (req, res) => {
  const result = await eventService.createEvent(req.user, req.body);
  res.status(201).json({ success: true, ...result });
};

const getPendingEvents = async (req, res) => {
  const result = await eventService.getPendingEvents();
  res.status(200).json({ success: true, ...result });
};

const updateEventStatus = async (req, res) => {
  const result = await eventService.updateEventStatus(req.params.id, req.body);
  res.status(200).json({ success: true, ...result });
};

const getApprovedEvents = async (req, res) => {
  const result = await eventService.getApprovedEvents();
  res.status(200).json({ success: true, ...result });
};

module.exports = {
  createEvent,
  getPendingEvents,
  updateEventStatus,
  getApprovedEvents,
};
