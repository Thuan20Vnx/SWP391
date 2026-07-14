const TYPE_LABELS = {
  edit: 'Chỉnh sửa',
  delete: 'Xóa CLB',
};

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  approved: 'Đã chấp nhận',
  rejected: 'Đã từ chối',
};

const formatDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('vi-VN');
};

const formatClubChangeRequest = (doc, club) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  const c = club?.toObject ? club.toObject() : club;
  return {
    id: o._id?.toString() || o.id,
    clubId: o.clubId?.toString?.() || o.clubId,
    requestType: o.requestType,
    requestTypeLabel: TYPE_LABELS[o.requestType] || o.requestType,
    status: o.status,
    statusLabel: STATUS_LABELS[o.status] || o.status,
    reason: o.reason || '',
    adminNote: o.adminNote || '',
    requestedByEmail: o.requestedByEmail || '',
    requestedByName: o.requestedByName || '',
    snapshot: o.snapshot || {},
    payload: o.payload || {},
    processedByEmail: o.processedByEmail || '',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    createdAtLabel: formatDateTime(o.createdAt),
    club: c
      ? {
          id: c._id?.toString() || c.id,
          name: c.name,
          slug: c.slug,
          category: c.category,
          status: c.status,
        }
      : null,
  };
};

module.exports = { formatClubChangeRequest, TYPE_LABELS, STATUS_LABELS };
