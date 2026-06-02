const { resolveEventSpeakers } = require('../constants/eventSpeaker');
const { STATUS_LABELS } = require('../constants/eventWorkflow');
const { getModerationActionFromStatus } = require('../constants/eventModeration');

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
  const speakers = resolveEventSpeakers(o);
  const primarySpeaker = speakers[0];
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
    thumbnail: o.image || o.thumbnail || '',
    bannerFileName: o.bannerFileName || '',
    eventType: o.eventType || '',
    duration: o.duration || '',
    format: o.format || 'campus',
    campus: o.campus || '',
    eventState: o.eventState || 'active',
    postponeReason: o.postponeReason || '',
    postponeIsWeather: o.postponeIsWeather === true,
    statusBeforeModeration: o.statusBeforeModeration || '',
    moderationReason: o.moderationReason || '',
    moderationRequestedByEmail: o.moderationRequestedByEmail || '',
    moderationRequestedAt: o.moderationRequestedAt || null,
    moderationAction: getModerationActionFromStatus(o.status),
    ctsvEditUnlocked: o.ctsvEditUnlocked === true,
    isHidden: o.isHidden === true,
    speaker: primarySpeaker?.name || '',
    speakerRole: primarySpeaker?.role || '',
    speakerAvatar: primarySpeaker?.avatar || '',
    speakers,
    agenda: o.agenda || '',
    expectedAttendees: o.expectedAttendees ?? 0,
    ticketTypes: o.ticketTypes || [],
    source: o.source || 'club',
    partnerId: o.partnerId?.toString?.() || o.partnerId || null,
    managedByCtsv: o.source === 'school',
    createdByEmail: o.createdByEmail,
    approvedByEmail: o.approvedByEmail,
    ctsvSubmittedByEmail: o.ctsvSubmittedByEmail || '',
    ctsvSubmittedAt: o.ctsvSubmittedAt || null,
    adminApprovedByEmail: o.adminApprovedByEmail || '',
    adminApprovedAt: o.adminApprovedAt || null,
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
