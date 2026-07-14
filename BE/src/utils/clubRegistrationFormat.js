const STATUS_LABELS = {
  pending_icpdp: 'Chờ IC-PDP duyệt',
  pending_admin: 'Chờ Admin duyệt',
  approved: 'Đã phê duyệt',
  rejected: 'Từ chối',
  revision: 'Cần chỉnh sửa',
  cancelled: 'Đã hủy',
};

const formatClubRegistration = (doc) => {
  if (!doc) return null;
  const r = doc.toObject ? doc.toObject() : doc;
  const statusKey = r.status || 'pending_icpdp';
  return {
    id: String(r._id),
    clubName: r.clubName,
    proposedSlug: r.proposedSlug || '',
    category: r.category,
    description: r.description,
    president: r.president,
    presidentEmail: r.presidentEmail,
    contactEmail: r.contactEmail || r.presidentEmail,
    phone: r.phone || '',
    facebook: r.facebook || '',
    website: r.website || '',
    activityField: r.activityField || '',
    scale: r.scale || '',
    logoText: r.logoText || '',
    logoColor: r.logoColor || '#7c3aed',
    coverImage: r.coverImage || '',
    status: STATUS_LABELS[statusKey] || statusKey,
    statusKey,
    submittedByEmail: r.submittedByEmail || '',
    icpdpNote: r.icpdpNote || '',
    adminNote: r.adminNote || '',
    rejectionReason: r.rejectionReason || '',
    reviewedByEmail: r.reviewedByEmail || '',
    reviewedAt: r.reviewedAt || null,
    clubId: r.clubId ? String(r.clubId) : null,
    clubSlug: r.clubSlug || '',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
};

module.exports = { formatClubRegistration, STATUS_LABELS };
