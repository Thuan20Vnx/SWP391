const userService = require('../services/user.service');
const registrationService = require('../services/registration.service');

const getProfile = async (req, res) => {
  const result = await userService.getProfile(req.authEmail);
  res.status(200).json({ success: true, ...result });
};

const updateProfile = async (req, res) => {
  const result = await userService.updateProfile(req.authEmail, req.body);
  res.status(200).json({ success: true, ...result });
};

const changePassword = async (req, res) => {
  const result = await userService.changePassword(req.authEmail, req.body);
  res.status(200).json({ success: true, ...result });
};

const verifyPassword = async (req, res) => {
  const result = await userService.verifyPassword(req.authEmail, req.body.password);
  res.status(200).json({ success: true, ...result });
};

const getMyEvents = async (req, res) => {
  const result = await registrationService.getMyEvents(req.user._id, {
    tab: req.query.tab || 'upcoming',
  });
  res.status(200).json({ success: true, ...result });
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  verifyPassword,
  getMyEvents,
};
