const SystemSettings = require('../models/SystemSettings');
const AppError = require('../utils/AppError');
const { normalizeRole } = require('../utils/role');

const GLOBAL_ID = SystemSettings.GLOBAL_ID;

const DEFAULTS = {
  maintenanceMode: false,
  publicAnnouncements: true,
  maintenanceMessage: 'Hệ thống đang bảo trì định kỳ. Vui lòng quay lại sau.',
};

const STAFF_ROLES_DURING_MAINTENANCE = new Set(['admin', 'ctsv', 'icpdp']);

let cache = null;
let cacheAt = 0;
const CACHE_MS = 5000;

const toPublic = (doc) => ({
  maintenanceMode: Boolean(doc?.maintenanceMode),
  publicAnnouncements: doc?.publicAnnouncements !== false,
  maintenanceMessage: String(doc?.maintenanceMessage || DEFAULTS.maintenanceMessage).trim(),
  updatedAt: doc?.updatedAt || null,
});

const getSettings = async (useCache = true) => {
  const now = Date.now();
  if (useCache && cache && now - cacheAt < CACHE_MS) {
    return cache;
  }
  let doc = await SystemSettings.findById(GLOBAL_ID).lean();
  if (!doc) {
    doc = (
      await SystemSettings.create({
        _id: GLOBAL_ID,
        ...DEFAULTS,
      })
    ).toObject();
  }
  cache = doc;
  cacheAt = now;
  return doc;
};

const invalidateCache = () => {
  cache = null;
  cacheAt = 0;
};

const getPublicStatus = async () => toPublic(await getSettings());

const isStaffRole = (role) => STAFF_ROLES_DURING_MAINTENANCE.has(normalizeRole(role));

const assertLoginAllowed = async (user) => {
  const settings = await getSettings();
  if (!settings.maintenanceMode) return;
  if (!user || !isStaffRole(user.role)) {
    const err = new AppError(
      settings.maintenanceMessage || DEFAULTS.maintenanceMessage,
      503,
    );
    err.extra = { code: 'MAINTENANCE' };
    throw err;
  }
};

const updateMaintenanceSettings = async (payload, actorEmail = '') => {
  const patch = {};
  if (typeof payload.maintenanceMode === 'boolean') {
    patch.maintenanceMode = payload.maintenanceMode;
  }
  if (typeof payload.publicAnnouncements === 'boolean') {
    patch.publicAnnouncements = payload.publicAnnouncements;
  }
  if (payload.maintenanceMessage !== undefined) {
    patch.maintenanceMessage = String(payload.maintenanceMessage || '').trim()
      || DEFAULTS.maintenanceMessage;
  }
  if (Object.keys(patch).length === 0) {
    return toPublic(await getSettings(false));
  }
  patch.updatedBy = actorEmail || '';

  const doc = await SystemSettings.findByIdAndUpdate(
    GLOBAL_ID,
    { $set: patch, $setOnInsert: { _id: GLOBAL_ID, ...DEFAULTS } },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  invalidateCache();
  return toPublic(doc);
};

module.exports = {
  DEFAULTS,
  STAFF_ROLES_DURING_MAINTENANCE,
  getSettings,
  getPublicStatus,
  toPublic,
  isStaffRole,
  assertLoginAllowed,
  updateMaintenanceSettings,
  invalidateCache,
};
