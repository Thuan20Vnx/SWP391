const { EVENT_VENUES } = require('../constants/eventVenues');

const VENUE_ALIASES = [
  { pattern: /gamma/i, venue: 'Sảnh tòa Gamma' },
  { pattern: /beta.*4|tầng\s*4.*beta|tang\s*4.*beta/i, venue: 'Tầng 4 tòa Beta' },
  { pattern: /beta/i, venue: 'Sảnh tòa Beta' },
  { pattern: /alpha.*5|tầng\s*5.*alpha|tang\s*5.*alpha/i, venue: 'Tầng 5 tòa Alpha' },
];

const collapse = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const normalizeEventVenue = (location) => {
  const raw = collapse(location);
  if (!raw) {
    return { raw: '', canonicalVenue: '', isKnownVenue: false };
  }

  const exact = EVENT_VENUES.find((v) => v.toLowerCase() === raw.toLowerCase());
  if (exact) {
    return { raw, canonicalVenue: exact, isKnownVenue: true };
  }

  for (const alias of VENUE_ALIASES) {
    if (alias.pattern.test(raw)) {
      return { raw, canonicalVenue: alias.venue, isKnownVenue: true };
    }
  }

  return { raw, canonicalVenue: raw.toLowerCase(), isKnownVenue: true };
};

const calendarDayKey = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
};

module.exports = {
  normalizeEventVenue,
  calendarDayKey,
};
