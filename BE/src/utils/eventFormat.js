const STATUS_LABELS = {
  pending: 'CHỜ DUYỆT',
  approved: 'MỞ ĐĂNG KÝ',
  rejected: 'TỪ CHỐI',
  draft: 'Bản nháp',
  pending_icpdp: 'CHỜ ICPDP',
  pending_ctsv: 'CHỜ CTSV DUYỆT',
  revision: 'CẦN CHỈNH SỬA',
  live: 'ĐANG DIỄN RA',
  ended: 'ĐÃ KẾT THÚC'
};

const formatDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const h = String(dt.getHours()).padStart(2, '0');
  const m = String(dt.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const formatEvent = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  const cap = o.capacity || o.totalTickets || 0;
  const remaining = Math.max(0, cap - (o.registeredCount || 0));
  return {
    id: o._id?.toString() || o.id,
    title: o.title,
    description: o.description || '',
    category: o.category,
    date: formatDate(o.startDate),
    time: formatTime(o.startDate),
    startDate: o.startDate,
    endDate: o.endDate,
    location: o.location,
    remainingTickets: remaining,
    totalTickets: cap,
    capacity: cap,
    registeredCount: o.registeredCount || 0,
    status: STATUS_LABELS[o.status] || o.status,
    statusKey: o.status,
    image: o.image || o.thumbnail || '',
    thumbnail: o.thumbnail || o.image || '',
    bannerFileName: o.bannerFileName || '',
    eventType: o.eventType || '',
    duration: o.duration || '',
    format: o.format || 'campus',
    speaker: o.speaker || '',
    agenda: o.agenda || '',
    expectedAttendees: o.expectedAttendees ?? 0,
    ticketTypes: o.ticketTypes || [],
    source: o.source,
    createdByEmail: o.createdByEmail,
    approvedByEmail: o.approvedByEmail,
    ctsvNote: o.ctsvNote,
    rejectionReason: o.rejectionReason,
    expectedRevenue: o.expectedRevenue || 0,
    proposalId: o.proposalId?.toString?.() || o.proposalId
  };
};

const formatProposal = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: o._id?.toString() || o.id,
    title: o.title,
    description: o.description || '',
    category: o.category,
    date: formatDate(o.startDate),
    time: formatTime(o.startDate),
    startDate: o.startDate,
    endDate: o.endDate,
    location: o.location,
    totalTickets: o.totalTickets || 0,
    ticketPrice: o.ticketPrice ?? 0,
    ticketTypes: o.ticketTypes || [],
    expectedAttendees: o.expectedAttendees ?? 0,
    image: o.image || '',
    clubId: o.clubId,
    clubName: o.clubName,
    submittedByEmail: o.submittedByEmail,
    status: STATUS_LABELS[o.status] || o.status,
    statusKey: o.status,
    icpdpNote: o.icpdpNote,
    ctsvNote: o.ctsvNote,
    rejectionReason: o.rejectionReason,
    eventId: o.eventId?.toString?.() || o.eventId
  };
};

module.exports = { formatEvent, formatProposal, STATUS_LABELS, formatDate, formatTime };
