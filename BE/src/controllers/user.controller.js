const userService = require('../services/user.service');
const registrationService = require('../services/registration.service');
const clubService = require('../services/club.service');
const reviewService = require('../services/review.service');

const getProfile = async (req, res) => {
  const result = await userService.getProfile(req.authEmail);
  res.status(200).json({ success: true, ...result });
};

const updateProfile = async (req, res) => {
  const result = await userService.updateProfile(req.authEmail, req.body);
  res.status(200).json({ success: true, ...result });
};

const updateAvatar = async (req, res) => {
  const image = req.body?.picture ?? req.body?.avatar;
  if (!image) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu dữ liệu ảnh đại diện.',
    });
  }
  const result = await userService.updateUserAvatar(req.authEmail, image);
  res.status(200).json({ success: true, ...result });
};

const getAvatar = async (req, res) => {
  await userService.sendUserAvatar(req.params.userId, res);
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

const getMyClubs = async (req, res) => {
  const result = await clubService.getMyClubs(req.user._id, req.query.tab || 'joined');
  res.status(200).json({ success: true, ...result });
};

const getEventReviews = async (req, res) => {
  const result = await reviewService.getEventReviews(req.user._id, {
    tab: req.query.tab || 'pending',
  });
  res.status(200).json({ success: true, ...result });
};

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  getAvatar,
  changePassword,
  verifyPassword,
  getMyEvents,
  getMyClubs,
  getEventReviews,
};
