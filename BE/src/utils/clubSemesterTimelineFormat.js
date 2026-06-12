const STATUS_LABELS = {
  draft: 'Bản nháp',
  pending_icpdp: 'Chờ IC-PDP duyệt',
  pending_ctsv: 'Chờ CTSV duyệt',
  approved: 'Đã phê duyệt',
  rejected: 'Từ chối',
  revision: 'Cần chỉnh sửa',
};

const TERM_LABELS = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
};

const TERM_ORDER = { spring: 1, summer: 2, fall: 3 };

const buildSemesterLabel = (term, year) => {
  const termLabel = TERM_LABELS[term] || term;
  return `${termLabel} ${year}`;
};

const formatTimelineItem = (item) => ({
  title: item.title || '',
  description: item.description || '',
  plannedDate: item.plannedDate || null,
  category: item.category || 'Workshop',
  location: item.location || '',
  expectedAttendees: Number(item.expectedAttendees) || 0,
  notes: item.notes || '',
});

const formatClubSemesterTimeline = (doc) => {
  if (!doc) return null;
  const r = doc.toObject ? doc.toObject() : doc;
  const statusKey = r.status || 'draft';
  return {
    id: String(r._id),
    clubId: r.clubId ? String(r.clubId) : '',
    clubName: r.clubName || '',
    clubSlug: r.clubSlug || '',
    semesterTerm: r.semesterTerm,
    semesterYear: r.semesterYear,
    semesterLabel: r.semesterLabel || buildSemesterLabel(r.semesterTerm, r.semesterYear),
    summary: r.summary || '',
    objectives: r.objectives || '',
    items: Array.isArray(r.items) ? r.items.map(formatTimelineItem) : [],
    status: STATUS_LABELS[statusKey] || statusKey,
    statusKey,
    submittedByEmail: r.submittedByEmail || '',
    icpdpNote: r.icpdpNote || '',
    ctsvNote: r.ctsvNote || '',
    rejectionReason: r.rejectionReason || '',
    reviewedByEmail: r.reviewedByEmail || '',
    reviewedAt: r.reviewedAt || null,
    submittedAt: r.submittedAt || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
};

module.exports = {
  STATUS_LABELS,
  TERM_LABELS,
  TERM_ORDER,
  buildSemesterLabel,
  formatTimelineItem,
  formatClubSemesterTimeline,
};
