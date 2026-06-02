const TYPE_LABELS = {
  edit: 'Chỉnh sửa',
  delete: 'Xóa sự kiện',
  hide: 'Ẩn sự kiện'
};

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  approved: 'Đã chấp nhận',
  rejected: 'Đã từ chối'
};

const formatDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('vi-VN');
};

const formatChangeRequest = (doc, event) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  const ev = event?.toObject ? event.toObject({ virtuals: true }) : event;
  return {
    id: o._id?.toString() || o.id,
    eventId: o.eventId?.toString?.() || o.eventId,
    requestType: o.requestType,
    requestTypeLabel: TYPE_LABELS[o.requestType] || o.requestType,
    status: o.status,
    statusLabel: STATUS_LABELS[o.status] || o.status,
    reason: o.reason || '',
    adminNote: o.adminNote || '',
    requestedByEmail: o.requestedByEmail || '',
    requestedByName: o.requestedByName || '',
    clubName: o.clubName || '',
    snapshot: o.snapshot || {},
    payload: o.payload || {},
    processedByEmail: o.processedByEmail || '',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    createdAtLabel: formatDateTime(o.createdAt),
    event: ev
      ? {
          id: ev._id?.toString() || ev.id,
          title: ev.title,
          category: ev.category,
          location: ev.location,
          startDate: ev.startDate,
          endDate: ev.endDate,
          status: ev.status,
          isHidden: ev.isHidden === true,
          isDeleted: ev.isDeleted === true,
          thumbnail: ev.thumbnail || ev.image || ''
        }
      : null
  };
};

module.exports = { formatChangeRequest, TYPE_LABELS, STATUS_LABELS };
