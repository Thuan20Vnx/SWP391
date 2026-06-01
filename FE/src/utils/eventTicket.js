export const buildTicketCode = (eventId, registrationId) => {
  if (registrationId) {
    const suffix = String(registrationId).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
    return `FPT-${suffix || 'TICKET'}`;
  }
  const raw = String(eventId).replace(/[^a-f0-9]/gi, '');
  return `FPT-${raw.slice(-8).toUpperCase() || 'EVENT'}`;
};

export const buildTicketFromCardEvent = (event, { holderName = '', registrationId } = {}) => ({
  eventId: event.id,
  title: event.title,
  dateLabel: event.dateLabel,
  timeRange: '',
  location: event.location,
  priceLabel: event.priceLabel || 'MIỄN PHÍ',
  holderName,
  ticketCode: buildTicketCode(event.id, registrationId),
  thumbnail: event.thumbnail,
});

export const buildTicketFromDetailEvent = (event, { holderName = '', registrationId } = {}) => ({
  eventId: event.id,
  title: event.title,
  dateLabel: event.dateShort,
  timeRange: event.timeRange,
  location: event.location,
  priceLabel: event.priceLabel || 'MIỄN PHÍ',
  holderName,
  ticketCode: buildTicketCode(event.id, registrationId),
  thumbnail: event.thumbnail,
});
