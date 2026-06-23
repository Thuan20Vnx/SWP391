const { normalizeRole } = require('../utils/role');

const READONLY_STAFF_ROLES = new Set(['ctsv', 'icpdp']);
const LOGIN_ALLOWED_STAFF = new Set(['admin', 'ctsv', 'icpdp']);

const isReadOnlyHttpMethod = (method) => {
  const m = String(method || 'GET').toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
};

const isMaintenanceViewOnlyStaff = (role) =>
  READONLY_STAFF_ROLES.has(normalizeRole(role));

const isAdminRole = (role) => normalizeRole(role) === 'admin';

const isLoginAllowedStaff = (role) => LOGIN_ALLOWED_STAFF.has(normalizeRole(role));

module.exports = {
  READONLY_STAFF_ROLES,
  isReadOnlyHttpMethod,
  isMaintenanceViewOnlyStaff,
  isAdminRole,
  isLoginAllowedStaff,
};
