/**
 * MSSV stored in DB as studentId — format DSxxxxxx or DExxxxxx
 * Cohort digits (positions 3-4) map to course: 18 → K18, 19 → K19
 */
export const formatMssv = (studentId) => {
  if (!studentId || typeof studentId !== 'string') return '';
  return studentId.trim().toUpperCase();
};

export const deriveCourseFromMssv = (studentId) => {
  const normalized = formatMssv(studentId);
  const match = normalized.match(/^(DS|DE)(\d{2})/i);
  if (!match) return null;
  return `K${match[2]}`;
};
