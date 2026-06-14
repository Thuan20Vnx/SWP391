const computeGrantExpiresAt = (grant) => {
  if (!grant || grant.revokedAt) return null;
  if (grant.validityType === 'permanent') return null;
  if (grant.validityType === 'until' && grant.validUntil) return new Date(grant.validUntil);
  if (grant.validityType === 'duration' && grant.durationMinutes) {
    const base = grant.grantedAt ? new Date(grant.grantedAt) : new Date();
    return new Date(base.getTime() + grant.durationMinutes * 60 * 1000);
  }
  return null;
};

const isGrantActive = (grant, now = new Date()) => {
  if (!grant || grant.revokedAt) return false;
  if (grant.validityType === 'permanent') return true;
  const expiresAt = computeGrantExpiresAt(grant);
  if (!expiresAt) return false;
  return expiresAt > now;
};

const formatScannerGrant = (grant) => {
  if (!grant) return null;
  const g = grant.toObject ? grant.toObject({ virtuals: false }) : grant;
  const scanner = g.scannerUser && typeof g.scannerUser === 'object' ? g.scannerUser : null;
  const expiresAt = computeGrantExpiresAt(g);
  return {
    id: String(g._id),
    eventId: String(g.event),
    validityType: g.validityType,
    validUntil: g.validUntil || null,
    durationMinutes: g.durationMinutes || null,
    grantedAt: g.grantedAt,
    expiresAt,
    active: isGrantActive(g),
    revokedAt: g.revokedAt || null,
    note: g.note || '',
    scanner: scanner
      ? { id: String(scanner._id), fullname: scanner.fullname, email: scanner.email, studentId: scanner.studentId || '' }
      : { id: String(g.scannerUser) },
    grantedByRole: g.grantedByRole,
  };
};

module.exports = { computeGrantExpiresAt, isGrantActive, formatScannerGrant };
