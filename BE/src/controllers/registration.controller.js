const registrationService = require('../services/registration.service');

const registerForEvent = async (req, res) => {
  const result = await registrationService.registerForEvent(req.user, req.params.id);
  res.status(201).json({ success: true, ...result });
};

const cancelRegistration = async (req, res) => {
  const result = await registrationService.cancelRegistration(req.user._id, req.params.id);
  res.status(200).json({ success: true, ...result });
};

module.exports = {
  registerForEvent,
  cancelRegistration,
};
