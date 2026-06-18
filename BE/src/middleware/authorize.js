const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { normalizeRole } = require('../utils/role');

const resolveEmail = (req) =>
  req.authEmail ||
  req.headers['x-user-email'] ||
  req.query.email ||
  req.body.email;

const authorize = (...allowedRoles) => asyncHandler(async (req, res, next) => {
  const email = resolveEmail(req);

  if (!email) {
    throw new AppError('Thiếu email xác thực!', 401);
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    throw new AppError('Người dùng không tồn tại!', 401);
  }

  if (allowedRoles.length > 0) {
    const allowed = allowedRoles.map((r) => normalizeRole(r));
    if (!allowed.includes(normalizeRole(user.role))) {
      throw new AppError('Bạn không có quyền thực hiện thao tác này!', 403);
    }
  }

  req.user = user;
  req.userRole = normalizeRole(user.role);
  next();
});

module.exports = authorize;
