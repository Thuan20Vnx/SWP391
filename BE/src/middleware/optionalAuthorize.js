const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const optionalAuthorize = asyncHandler(async (req, res, next) => {
  const email = req.authEmail;

  if (!email) {
    return next();
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (user) {
    req.user = user;
  }

  next();
});

module.exports = optionalAuthorize;
