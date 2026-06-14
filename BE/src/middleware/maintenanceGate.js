const User = require('../models/User');
const {
  getSettings,
  isStaffRole,
} = require('../services/systemSettings.service');
const { normalizeRole } = require('../utils/role');

const EXEMPT_PREFIXES = ['/api/auth', '/api/system'];

const maintenanceGate = async (req, res, next) => {
  try {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (EXEMPT_PREFIXES.some((p) => path.startsWith(p))) {
      return next();
    }

    const settings = await getSettings();
    if (!settings.maintenanceMode) {
      return next();
    }

    const email =
      req.authEmail ||
      req.headers['x-user-email'] ||
      req.query?.email ||
      req.body?.email;

    if (!email) {
      return res.status(503).json({
        success: false,
        maintenance: true,
        message:
          settings.maintenanceMessage ||
          'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
      });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user || !isStaffRole(normalizeRole(user.role))) {
      return res.status(503).json({
        success: false,
        maintenance: true,
        message:
          settings.maintenanceMessage ||
          'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
      });
    }

    return next();
  } catch (err) {
    console.error('maintenanceGate:', err);
    return next();
  }
};

module.exports = maintenanceGate;
