const MAINTENANCE_GRACE_MS = 15_000;

const resolveMaintenanceActivatedAt = (settings) => {
  if (!settings?.maintenanceMode) return null;
  if (settings.maintenanceActivatedAt) {
    const t = new Date(settings.maintenanceActivatedAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (settings.updatedAt) {
    const t = new Date(settings.updatedAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
};

const isInMaintenanceGrace = (settings, now = Date.now()) => {
  const started = resolveMaintenanceActivatedAt(settings);
  if (started == null) return false;
  return now < started + MAINTENANCE_GRACE_MS;
};

const shouldEnforceMaintenance = (settings, now = Date.now()) =>
  Boolean(settings?.maintenanceMode) && !isInMaintenanceGrace(settings, now);

module.exports = {
  MAINTENANCE_GRACE_MS,
  MAINTENANCE_GRACE_SEC: MAINTENANCE_GRACE_MS / 1000,
  isInMaintenanceGrace,
  shouldEnforceMaintenance,
};
