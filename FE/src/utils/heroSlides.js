import { resolveEventDisplayImage } from './eventDisplay';

const getNumericTime = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const getRegisteredCount = (event) => Number(event?.registeredCount ?? event?.filledSlots ?? 0) || 0;

const resolveHeroImage = (event) => resolveEventDisplayImage(event, '');

/**
 * Sự kiện còn diễn ra / sắp diễn ra. Banner phải ưu tiên nhóm này, nếu không
 * vài sự kiện cũ có lượt đăng ký cao sẽ chiếm banner mãi và sự kiện mới không
 * bao giờ xuất hiện.
 */
const isUpcomingEvent = (event) => {
  if (event?.eventState && event.eventState !== 'active') return false;
  const end = getNumericTime(event?.endDate);
  return end === 0 || end >= Date.now();
};

const getStartTime = (event) => getNumericTime(event?.startDate || event?.dateLabel || event?.date);

export const pickFeaturedEvents = (events = [], limit = 3) =>
  [...events]
    .filter((event) => event && (event.id || event._id) && event.title && resolveHeroImage(event))
    .sort((a, b) => {
      const upcomingDiff = Number(isUpcomingEvent(b)) - Number(isUpcomingEvent(a));
      if (upcomingDiff !== 0) return upcomingDiff;

      // Trong nhóm sắp diễn ra: sự kiện gần nhất lên trước, để banner đổi theo lịch.
      if (isUpcomingEvent(a) && isUpcomingEvent(b)) {
        const startDiff = getStartTime(a) - getStartTime(b);
        if (startDiff !== 0) return startDiff;
      }

      const registrationDiff = getRegisteredCount(b) - getRegisteredCount(a);
      if (registrationDiff !== 0) return registrationDiff;
      return getStartTime(a) - getStartTime(b);
    })
    .slice(0, limit);

export const mapEventsToHeroSlides = (events = [], options = {}) => {
  const {
    limit = 3,
    categoryLabel = (event) => event?.categoryLabel || event?.category || '',
    organizerLabel = (event) => event?.organizerLabel || '',
    dateLabel = (event) => event?.dateLabel || event?.date || '',
    location = (event) => event?.location || '',
  } = options;

  return pickFeaturedEvents(events, limit).map((event) => ({
    eventId: String(event.id || event._id || ''),
    title: event.title,
    dateLabel: dateLabel(event),
    location: location(event),
    categoryLabel: categoryLabel(event),
    organizerLabel: organizerLabel(event),
    image: resolveHeroImage(event),
  }));
};
