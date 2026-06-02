const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { normalizeRole } = require('../utils/role');

const BLOCKED_ROLES = new Set(['admin', 'ctsv', 'icpdp']);

const resolveEmail = (req) =>
  req.authEmail ||
  req.headers['x-user-email'] ||
  req.query.email ||
  req.body.email;

/** Mọi tài khoản đã đăng nhập (trừ admin/CTSV/ICPDP) đều có thể đăng ký sự kiện */
const authorizeEventParticipant = asyncHandler(async (req, res, next) => {
  const email = resolveEmail(req);

  if (!email) {
    throw new AppError('Thiếu email xác thực!', 401);
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    throw new AppError('Người dùng không tồn tại!', 401);
  }

  const role = normalizeRole(user.role);

  if (BLOCKED_ROLES.has(role)) {
    throw new AppError('Bạn không có quyền thực hiện thao tác này!', 403);
  }

  req.user = user;
  next();
});

module.exports = authorizeEventParticipant;
