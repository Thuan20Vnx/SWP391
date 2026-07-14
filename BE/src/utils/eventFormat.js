const { STATUS_LABELS } = require('../constants/eventWorkflow');
const { getModerationActionFromStatus } = require('../constants/eventModeration');
const { sanitizeEventCoverForApi } = require('./eventCoverStorage');
const { sanitizeEventPlanForApi, PLAN_SCOPES, buildClubTimelinePlanUrl, buildSchoolTimelinePlanUrl } = require('./eventPlanStorage');
const { sanitizeSpeakersForApi } = require('./speakerAvatarStorage');
const { sanitizeProposalCoverForApi } = require('./proposalCoverStorage');

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

const formatEvent = (doc, opts = {}) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  const cap = o.capacity || o.totalTickets || 0;
  const remaining = Math.max(0, cap - (o.registeredCount || 0));
  const cover = sanitizeEventCoverForApi(o);
  const plan = sanitizeEventPlanForApi(o, PLAN_SCOPES.events);
  const speakerMeta = sanitizeSpeakersForApi(o);
  return {
    id: o._id?.toString() || o.id,
    title: o.title,
    description: o.description || '',
    category: o.category,
    date: formatDate(o.startDate),
    time: formatTime(o.startDate),
    startDate: o.startDate,
    endDate: o.endDate,
    registrationStartDate: o.registrationStartDate || null,
    registrationEndDate: o.registrationEndDate || null,
    ticketPrice: o.ticketPrice ?? 0,
    location: o.location,
    remainingTickets: remaining,
    totalTickets: cap,
    capacity: cap,
    registeredCount: o.registeredCount || 0,
    status: STATUS_LABELS[o.status] || o.status,
    statusKey: o.status,
    image: cover.image,
    thumbnail: cover.thumbnail,
    hasCover: cover.hasCover,
    coverUrl: cover.coverUrl,
    bannerFileName: o.bannerFileName || '',
    eventPlanFileName: plan.eventPlanFileName,
    eventPlanFileMime: plan.eventPlanFileMime,
    eventPlanLink: plan.eventPlanLink,
    hasEventPlanFile: plan.hasEventPlanFile,
    hasEventPlan: plan.hasEventPlan,
    eventPlanUrl: plan.eventPlanUrl,
    eventPlanFile: '',
    eventType: o.eventType || '',
    duration: o.duration || '',
    format: o.format || 'campus',
    campus: o.campus || '',
    eventState: o.eventState || 'active',
    postponeReason: o.postponeReason || '',
    postponeIsWeather: o.postponeIsWeather === true,
    statusBeforeModeration: o.statusBeforeModeration || '',
    moderationReason: o.moderationReason || '',
    moderationReasonCategory: o.moderationReasonCategory || '',
    moderationRequestedByEmail: o.moderationRequestedByEmail || '',
    moderationRequestedAt: o.moderationRequestedAt || null,
    moderationAction: getModerationActionFromStatus(o.status),
    icpdpNote: o.icpdpNote || '',
    ctsvEditUnlocked: o.ctsvEditUnlocked === true,
    clubEditUnlocked: o.clubEditUnlocked === true,
    pendingEdit: o.pendingEdit || null,
    lastModerationAction: o.lastModerationAction || '',
    lastModerationRejectedBy: o.lastModerationRejectedBy || '',
    isHidden: o.isHidden === true,
    speaker: speakerMeta.speaker,
    speakerRole: speakerMeta.speakerRole,
    speakerAvatar: speakerMeta.speakerAvatar,
    speakers: speakerMeta.speakers,
    agenda: o.agenda || '',
    learningOutcomes: Array.isArray(o.learningOutcomes) ? o.learningOutcomes : [],
    expectedAttendees: o.expectedAttendees ?? 0,
    ticketTypes: o.ticketTypes || [],
    source: o.source || 'club',
    schoolOrganizerRole: o.schoolOrganizerRole || 'ctsv',
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
    settlement: {
      status: o.settlement?.status || 'none',
      requestedAt: o.settlement?.requestedAt || null,
      paidAt: o.settlement?.paidAt || null,
      paidAmount: o.settlement?.paidAmount || 0,
      note: o.settlement?.note || '',
      proofUrl: o.settlement?.proofUrl || '',
    },
    proposalId: o.proposalId?.toString?.() || o.proposalId,
    timelineSource: o.timelineSource?.itemTitle
      ? {
          timelineId: o.timelineSource.timelineId?.toString?.() || o.timelineSource.timelineId || null,
          itemTitle: o.timelineSource.itemTitle || '',
          semesterLabel: o.timelineSource.semesterLabel || '',
        }
      : null,
    createdAt: o.createdAt || null,
    updatedAt: o.updatedAt || null,
  };
};

const formatProposal = (doc, opts = {}) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  const plan = sanitizeEventPlanForApi(o, PLAN_SCOPES.proposals);
  const cover = sanitizeProposalCoverForApi(o);
  return {
    id: o._id?.toString() || o.id,
    title: o.title,
    description: o.description || '',
    learningOutcomes: Array.isArray(o.learningOutcomes) ? o.learningOutcomes : [],
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
    image: cover.image || '',
    coverUrl: cover.coverUrl || '',
    hasCover: cover.hasCover,
    eventPlanFileName: plan.eventPlanFileName,
    eventPlanFileMime: plan.eventPlanFileMime,
    eventPlanLink: plan.eventPlanLink,
    hasEventPlanFile: plan.hasEventPlanFile,
    hasEventPlan: plan.hasEventPlan,
    eventPlanUrl: plan.eventPlanUrl,
    eventPlanFile: '',
    clubId: o.clubId,
    clubName: o.clubName,
    submittedByEmail: o.submittedByEmail,
    status: STATUS_LABELS[o.status] || o.status,
    statusKey: o.status,
    icpdpNote: o.icpdpNote,
    ctsvNote: o.ctsvNote,
    rejectionReason: o.rejectionReason,
    eventId: o.eventId?.toString?.() || o.eventId,
    linkedEventId: o.linkedEventId?.toString?.() || o.linkedEventId || null,
    timelineSource: o.timelineSource?.itemTitle
      ? {
          timelineId: o.timelineSource.timelineId?.toString?.() || o.timelineSource.timelineId || null,
          itemTitle: o.timelineSource.itemTitle || '',
          semesterLabel: o.timelineSource.semesterLabel || '',
        }
      : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

module.exports = { formatEvent, formatProposal, STATUS_LABELS, formatDate, formatTime };
