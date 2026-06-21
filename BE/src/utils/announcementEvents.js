const Event = require('../models/Event');

const ANNOUNCEMENT_EVENT_STATUSES = ['approved', 'live'];

/** Chỉ lấy sự kiện thật đã tồn tại trong hệ thống, không tự sinh placeholder cho đối tác. */
const findLinkableAnnouncementEvents = async () => {
  const events = await Event.find({
    source: { $in: ['school', 'partner'] },
    status: { $in: ANNOUNCEMENT_EVENT_STATUSES },
    isDeleted: { $ne: true },
  })
    .select('-image -thumbnail')
    .sort({ startDate: 1 });

  return events;
};

const isEventLinkableForAnnouncement = async (eventId) => {
  if (!eventId) return true;

  const event = await Event.findById(eventId);
  if (!event) return false;
  if (event.isDeleted) return false;
  if (!ANNOUNCEMENT_EVENT_STATUSES.includes(event.status)) return false;
  return ['school', 'partner'].includes(event.source);
};

module.exports = {
  ANNOUNCEMENT_EVENT_STATUSES,
  findLinkableAnnouncementEvents,
  isEventLinkableForAnnouncement,
};
