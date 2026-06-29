const User = require('../models/User');
const { normalizeRole, resolveUserRole } = require('../utils/role');

const CTSV_PORTAL_ROLES = ['ctsv', 'icpdp', 'admin'];
const CTSV_APPROVE_ROLES = ['ctsv', 'admin'];
const SCHOOL_EVENT_SUBMIT_ROLES = ['ctsv', 'admin', 'icpdp'];
const PROPOSAL_MODERATE_ROLES = ['ctsv', 'admin', 'icpdp'];
const ICPDP_APPROVE_ROLES = ['icpdp', 'ctsv'];
const ICPDP_TIMELINE_ROLES = ['icpdp', 'admin'];
const ICPDP_ONLY_ROLES = ['icpdp'];

const requireRole = (allowedRoles) => async (req, res, next) => {
  try {
    const tokenRole = normalizeRole(req.authRole);
    if (tokenRole && allowedRoles.includes(tokenRole)) {
      req.userRole = tokenRole;
      return next();
    }

    const email = String(req.authEmail || '').trim().toLowerCase();
    const user = await User.findOne({ email });
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

const ADMIN_ROLES = ['admin'];

const requireCtsvPortal = requireRole(CTSV_PORTAL_ROLES);
const requireCtsvApprove = requireRole(CTSV_APPROVE_ROLES);
const requireSchoolEventSubmit = requireRole(SCHOOL_EVENT_SUBMIT_ROLES);
const requireProposalModerate = requireRole(PROPOSAL_MODERATE_ROLES);
const requireIcpdpOrCtsv = requireRole(ICPDP_APPROVE_ROLES);
const requireIcpdpTimeline = requireRole(ICPDP_TIMELINE_ROLES);
const requireIcpdp = requireRole(ICPDP_ONLY_ROLES);
const requireAdmin = requireRole(ADMIN_ROLES);

module.exports = {
  requireRole,
  requireCtsvPortal,
  requireCtsvApprove,
  requireSchoolEventSubmit,
  requireProposalModerate,
  requireIcpdpOrCtsv,
  requireIcpdpTimeline,
  requireIcpdp,
  requireAdmin,
  CTSV_PORTAL_ROLES,
  CTSV_APPROVE_ROLES,
  SCHOOL_EVENT_SUBMIT_ROLES,
  PROPOSAL_MODERATE_ROLES,
  ADMIN_ROLES
};
