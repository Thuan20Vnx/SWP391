import { resolveEventDisplayImage } from './eventDisplay';

const getNumericTime = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const getRegisteredCount = (event) => Number(event?.registeredCount ?? event?.filledSlots ?? 0) || 0;

const resolveHeroImage = (event) => resolveEventDisplayImage(event, '');

export const pickFeaturedEvents = (events = [], limit = 3) =>
  [...events]
    .filter((event) => event && (event.id || event._id) && event.title && resolveHeroImage(event))
    .sort((a, b) => {
      const registrationDiff = getRegisteredCount(b) - getRegisteredCount(a);
      if (registrationDiff !== 0) return registrationDiff;
      return getNumericTime(a.startDate || a.dateLabel || a.date) - getNumericTime(b.startDate || b.dateLabel || b.date);
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
