const DEFAULT_GRACE_SEC = 15;

const resolveGraceMs = (settings) => {
  const sec = Number(settings?.maintenanceGraceSeconds);
  if (Number.isInteger(sec) && sec >= 5 && sec <= 600) return sec * 1000;
  return DEFAULT_GRACE_SEC * 1000;
};

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
  return now < started + resolveGraceMs(settings);
};

const shouldEnforceMaintenance = (settings, now = Date.now()) =>
  Boolean(settings?.maintenanceMode) && !isInMaintenanceGrace(settings, now);

module.exports = {
  DEFAULT_GRACE_SEC,
  resolveGraceMs,
  isInMaintenanceGrace,
  shouldEnforceMaintenance,
};
