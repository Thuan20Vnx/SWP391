export const MAINTENANCE_GRACE_MS = 15_000;
export const MAINTENANCE_GRACE_SEC = MAINTENANCE_GRACE_MS / 1000;

export const resolveMaintenanceActivatedAt = (status) => {
  if (!status?.maintenanceMode) return null;
  if (status.maintenanceActivatedAt) {
    const t = new Date(status.maintenanceActivatedAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (status.updatedAt) {
    const t = new Date(status.updatedAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
};

export const getMaintenanceGraceEndsAt = (status) => {
  const started = resolveMaintenanceActivatedAt(status);
  if (started == null) return null;
  return started + MAINTENANCE_GRACE_MS;
};

export const isMaintenanceGraceActive = (status, now = Date.now()) => {
  const endsAt = getMaintenanceGraceEndsAt(status);
  if (!endsAt) return false;
  return now < endsAt;
};

export const isMaintenanceBlocking = (status, now = Date.now()) => {
  if (!status?.maintenanceMode) return false;
  return !isMaintenanceGraceActive(status, now);
};

export const getMaintenanceGraceSecondsLeft = (status, now = Date.now()) => {
  const endsAt = getMaintenanceGraceEndsAt(status);
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
};
