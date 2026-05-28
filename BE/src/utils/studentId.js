/**
 * MSSV format: DSxxxxxx or DExxxxxx (2 letters + cohort digits + serial)
 * Cohort: 2 digits after prefix → K18, K19, ...
 * Examples: DE180111 → K18, DS190512 → K19
 */
const MSSV_PATTERN = /^(DS|DE)(\d{2})/i;

const normalizeStudentId = (studentId) => {
  if (!studentId || typeof studentId !== 'string') return '';
  return studentId.trim().toUpperCase();
};

const deriveCourseFromStudentId = (studentId) => {
  const normalized = normalizeStudentId(studentId);
  const match = normalized.match(MSSV_PATTERN);
  if (!match) return null;
  return `K${match[2]}`;
};

const isValidStudentIdFormat = (studentId) => {
  const normalized = normalizeStudentId(studentId);
  return MSSV_PATTERN.test(normalized) && normalized.length >= 8;
};

module.exports = {
  normalizeStudentId,
  deriveCourseFromStudentId,
  isValidStudentIdFormat,
};
