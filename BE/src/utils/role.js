const CTSV_EMAIL_PATTERNS = [
  /^ctsv[._-]/i,
  /@ctsv\./i,
  /ctsv@/i,
  /^khoahiep/i
];

const normalizeRole = (role) => {
  if (!role) return 'student';
  return String(role).trim().toLowerCase();
};

const resolveUserRole = (user) => {
  if (!user) return 'student';

  if (user.role) {
    return normalizeRole(user.role);
  }

  const email = (user.email || '').toLowerCase();
  const orientation = (user.orientation || '').toLowerCase();
  const campus = (user.campus || '').toLowerCase();

  if (
    CTSV_EMAIL_PATTERNS.some((re) => re.test(email)) ||
    orientation.includes('ctsv') ||
    orientation.includes('công tác sinh viên') ||
    campus.includes('ctsv')
  ) {
    return 'ctsv';
  }

  return 'student';
};

module.exports = { resolveUserRole, normalizeRole, CTSV_EMAIL_PATTERNS };
