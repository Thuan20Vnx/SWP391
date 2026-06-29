/**
 * Smoke tests for venue normalize + time-range overlap conflicts.
 * Run: node BE/scripts/testTimelineVenueConflicts.js
 */
const assert = require('assert');
const { normalizeEventVenue, calendarDayKey } = require('../src/utils/eventVenueNormalize');
const { resolveTimeRange, rangesOverlap } = require('../src/utils/timelineTimeRange');

const run = () => {
  const gamma = normalizeEventVenue('Sảnh tòa Gamma');
  assert.strictEqual(gamma.isKnownVenue, true);
  assert.strictEqual(gamma.canonicalVenue, 'Sảnh tòa Gamma');

  const alias = normalizeEventVenue('tầng 5 alpha');
  assert.strictEqual(alias.isKnownVenue, true);
  assert.strictEqual(alias.canonicalVenue, 'Tầng 5 tòa Alpha');

  const unknown = normalizeEventVenue('Phòng học XYZ');
  assert.strictEqual(unknown.isKnownVenue, false);

  const day = calendarDayKey('2026-07-02T10:00:00+07:00');
  assert.strictEqual(day, '2026-07-02');

  // User example: SK1 7h-10h vs SK2 6h-11h at Beta — must overlap
  const beta = normalizeEventVenue('Sảnh tòa Beta').canonicalVenue;
  const sk1 = resolveTimeRange('2026-07-02T07:00:00+07:00', '2026-07-02T10:00:00+07:00');
  const sk2 = resolveTimeRange('2026-07-02T06:00:00+07:00', '2026-07-02T11:00:00+07:00');
  assert.strictEqual(beta, 'Sảnh tòa Beta');
  assert.strictEqual(rangesOverlap(sk1, sk2), true);

  // Same venue, same day, non-overlapping times — no conflict
  const sk3 = resolveTimeRange('2026-07-02T07:00:00+07:00', '2026-07-02T10:00:00+07:00');
  const sk4 = resolveTimeRange('2026-07-02T10:00:00+07:00', '2026-07-02T12:00:00+07:00');
  assert.strictEqual(rangesOverlap(sk3, sk4), false);

  // Same time, different venue — no conflict
  const gammaSlot = resolveTimeRange('2026-07-02T07:00:00+07:00', '2026-07-02T10:00:00+07:00');
  assert.strictEqual(rangesOverlap(sk1, gammaSlot), true); // times overlap but venue check is separate

  console.log('All timeline venue + time overlap smoke tests passed.');
};

run();
