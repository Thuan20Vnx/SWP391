const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { getSettings } = require('../services/systemSettings.service');
const { shouldEnforceMaintenance } = require('../constants/maintenance');
const {
  isReadOnlyHttpMethod,
  isMaintenanceViewOnlyStaff,
  isAdminRole,
} = require('../constants/maintenanceRoles');
const { normalizeRole } = require('../utils/role');

const EXEMPT_PREFIXES = ['/api/auth', '/api/system'];

const peekAuthEmail = (req) => {
  if (req.authEmail) return req.authEmail;
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return '';
  try {
    const { verifyToken } = require('../utils/jwt');
    const payload = verifyToken(header.slice(7));
    return payload?.email ? String(payload.email).trim().toLowerCase() : '';
  } catch {
    return '';
  }
};

const maintenanceBlock = (res, settings, { readOnly = false } = {}) =>
  res.status(503).json({
    success: false,
    maintenance: true,
    readOnly,
    message: readOnly
      ? 'Hệ thống đang bảo trì. Chỉ được xem, không thể thao tác.'
      : settings.maintenanceMessage || 'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
  });

const maintenanceGate = asyncHandler(async (req, res, next) => {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (EXEMPT_PREFIXES.some((p) => path.startsWith(p))) {
    return next();
  }

  const settings = await getSettings();
  if (!shouldEnforceMaintenance(settings)) {
    return next();
  }

  const email =
    peekAuthEmail(req) ||
    req.headers['x-user-email'] ||
    req.query?.email ||
    req.body?.email;

  if (!email) {
    return maintenanceBlock(res, settings);
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) {
    return maintenanceBlock(res, settings);
  }

  const role = normalizeRole(user.role);

  if (isAdminRole(role)) {
    return next();
  }

  if (isMaintenanceViewOnlyStaff(role)) {
    if (isReadOnlyHttpMethod(req.method)) {
      return next();
    }
    return maintenanceBlock(res, settings, { readOnly: true });
  }

  return maintenanceBlock(res, settings);
});

module.exports = maintenanceGate;
