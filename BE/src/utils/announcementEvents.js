const Event = require('../models/Event');
const Partner = require('../models/Partner');

const ANNOUNCEMENT_EVENT_STATUSES = ['approved', 'live'];

/** Tạo sự kiện đối tác sau khi Admin phê duyệt (idempotent). */
const ensurePartnerEvent = async (partner) => {
  if (!partner || partner.status !== 'approved') return null;

  const existing = await Event.findOne({ partnerId: partner._id });
  if (existing) return existing;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 30);

  return Event.create({
    title: (partner.proposedEventTitle || `Sự kiện đối tác — ${partner.name}`).trim(),
    description: partner.description || '',
    category: 'Kết nối',
    startDate,
    location: partner.address || 'FPT University',
    capacity: 100,
    totalTickets: 100,
    status: 'approved',
    source: 'partner',
    partnerId: partner._id,
    createdByEmail: partner.email || '',
    approvedByEmail: partner.approvedByEmail || partner.ctsvApprovedByEmail || ''
  });
};

const ensureAllApprovedPartnerEvents = async () => {
  const partners = await Partner.find({ status: 'approved' });
  for (const partner of partners) {
    await ensurePartnerEvent(partner);
  }
};

/** Sự kiện CTSV tạo + sự kiện đối tác đã qua CTSV và Admin. */
const findLinkableAnnouncementEvents = async () => {
  await ensureAllApprovedPartnerEvents();

  const events = await Event.find({
    source: { $in: ['school', 'partner'] },
    status: { $in: ANNOUNCEMENT_EVENT_STATUSES }
  })
    .select('-image -thumbnail')
    .sort({ startDate: 1 })
    .populate('partnerId', 'status name');

  return events.filter((ev) => {
    if (ev.source === 'school') return true;
    if (ev.source === 'partner') {
      const partner = ev.partnerId;
      return partner && partner.status === 'approved';
    }
    return false;
  });
};

const isEventLinkableForAnnouncement = async (eventId) => {
  if (!eventId) return true;

  const event = await Event.findById(eventId).populate('partnerId', 'status');
  if (!event) return false;
  if (!ANNOUNCEMENT_EVENT_STATUSES.includes(event.status)) return false;
  if (event.source === 'school') return true;
  if (event.source === 'partner') {
    return event.partnerId?.status === 'approved';
  }
  return false;
};

module.exports = {
  ANNOUNCEMENT_EVENT_STATUSES,
  ensurePartnerEvent,
  findLinkableAnnouncementEvents,
  isEventLinkableForAnnouncement
};
