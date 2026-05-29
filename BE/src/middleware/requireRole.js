const User = require('../models/User');
const { normalizeRole, resolveUserRole } = require('../utils/role');

const CTSV_PORTAL_ROLES = ['ctsv', 'icpdp'];
const CTSV_APPROVE_ROLES = ['ctsv'];
const ICPDP_APPROVE_ROLES = ['icpdp', 'ctsv'];

const requireRole = (allowedRoles) => async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.authEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
    }

    const role = normalizeRole(resolveUserRole(user));
    req.user = user;
    req.userRole = role;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập tài nguyên này!'
      });
    }

    next();
  } catch (error) {
    console.error('requireRole error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
};

const requireCtsvPortal = requireRole(CTSV_PORTAL_ROLES);
const requireCtsvApprove = requireRole(CTSV_APPROVE_ROLES);
const requireIcpdpOrCtsv = requireRole(ICPDP_APPROVE_ROLES);

module.exports = {
  requireRole,
  requireCtsvPortal,
  requireCtsvApprove,
  requireIcpdpOrCtsv,
  CTSV_PORTAL_ROLES,
  CTSV_APPROVE_ROLES
};
