const ClubSemesterTimeline = require('../models/ClubSemesterTimeline');
const { normalizeEventVenue, calendarDayKey } = require('../utils/eventVenueNormalize');
const { resolveTimeRange, rangesOverlap, formatTimeRangeLabel } = require('../utils/timelineTimeRange');

const HOLDING_STATUSES = new Set(['pending_icpdp', 'pending_ctsv', 'pending_admin', 'approved']);

const isTimelineHolding = (row) => {
  if (!row || !HOLDING_STATUSES.has(row.status)) return false;
  const cr = row.changeRequest || {};
  if (cr.status === 'scheduled_delete') return false;
  if (row.status === 'approved' && cr.status === 'pending_admin' && cr.type === 'delete') return false;
  return true;
};

const resolveOwnerLabel = (row) => {
  if (row.ownerLabel) return row.ownerLabel;
  if (row.ownerType === 'icpdp') return 'IC-PDP';
  if (row.ownerType === 'ctsv') return 'CTSV';
  return row.clubName || 'CLB';
};

const buildHoldEntry = ({
  timelineId,
  ownerType,
  ownerLabel,
  semesterLabel,
  itemTitle,
  itemIndex,
  plannedDate,
  plannedEndDate,
  canonicalVenue,
  locationLabel,
  submittedAt,
}) => {
  const range = resolveTimeRange(plannedDate, plannedEndDate);
  if (!range || !canonicalVenue) return null;
  return {
    timelineId: String(timelineId),
    ownerType,
    ownerLabel,
    semesterLabel: semesterLabel || '',
    itemTitle: itemTitle || '',
    itemIndex,
    plannedDate,
    plannedEndDate: plannedEndDate || null,
    canonicalVenue,
    locationLabel: locationLabel || canonicalVenue,
    dayKey: calendarDayKey(plannedDate),
    range,
    submittedAt: new Date(submittedAt || 0).getTime(),
  };
};

const flattenHoldingItems = (rows = []) => {
  const flat = [];
  for (const row of rows) {
    if (!isTimelineHolding(row)) continue;
    const submittedAt = row.submittedAt || row.createdAt || new Date(0);
    const ownerType = row.ownerType || 'club';
    const ownerLabel = resolveOwnerLabel(row);
    (row.items || []).forEach((item, itemIndex) => {
      const { canonicalVenue, raw } = normalizeEventVenue(item.location);
      if (!canonicalVenue || !item.plannedDate) return;
      const entry = buildHoldEntry({
        timelineId: row._id,
        ownerType,
        ownerLabel,
        semesterLabel: row.semesterLabel,
        itemTitle: item.title,
        itemIndex,
        plannedDate: item.plannedDate,
        plannedEndDate: item.plannedEndDate,
        canonicalVenue,
        locationLabel: raw,
        submittedAt,
      });
      if (entry) flat.push(entry);
    });
  }
  return flat;
};

let registryCache = { at: 0, items: [] };
const REGISTRY_TTL_MS = 5000;

const loadRegistry = async () => {
  const now = Date.now();
  if (now - registryCache.at < REGISTRY_TTL_MS) return registryCache.items;
  const rows = await ClubSemesterTimeline.find({
    status: { $in: [...HOLDING_STATUSES] },
  })
    .select('ownerType ownerLabel clubName semesterLabel items status submittedAt createdAt changeRequest')
    .lean();
  registryCache = { at: now, items: flattenHoldingItems(rows) };
  return registryCache.items;
};

const invalidateRegistryCache = () => {
  registryCache = { at: 0, items: [] };
};

const formatConflictEntry = (entry, currentSubmittedAt) => ({
  timelineId: entry.timelineId,
  ownerType: entry.ownerType,
  ownerLabel: entry.ownerLabel,
  semesterLabel: entry.semesterLabel,
  itemTitle: entry.itemTitle,
  plannedDate: entry.plannedDate,
  plannedEndDate: entry.plannedEndDate,
  timeRangeLabel: formatTimeRangeLabel(entry.plannedDate, entry.plannedEndDate),
  location: entry.locationLabel || entry.canonicalVenue,
  submittedAt: entry.submittedAt ? new Date(entry.submittedAt).toISOString() : null,
  isPrior: entry.submittedAt < currentSubmittedAt,
  isSameTimeline: false,
});

/**
 * Find all registry / candidate holds overlapping venue + time.
 */
const findOverlappingHolds = ({
  canonicalVenue,
  range,
  excludeTimelineId,
  excludeItemIndex,
  candidates,
  currentSubmittedAt,
}) => {
  if (!canonicalVenue || !range) return [];

  return candidates
    .filter((entry) => {
      if (entry.canonicalVenue !== canonicalVenue) return false;
      if (!rangesOverlap(range, entry.range)) return false;
      if (
        excludeTimelineId &&
        entry.timelineId === String(excludeTimelineId) &&
        entry.itemIndex === excludeItemIndex
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.submittedAt - b.submittedAt || a.range.startMs - b.range.startMs);
};

const buildCandidatesFromFormItems = (items = [], { timelineId, submittedAt } = {}) => {
  const candidates = [];
  items.forEach((item, itemIndex) => {
    const { canonicalVenue, raw } = normalizeEventVenue(item.location);
    if (!canonicalVenue || !item.plannedDate) return;
    const entry = buildHoldEntry({
      timelineId: timelineId || 'draft',
      ownerType: 'draft',
      ownerLabel: 'Bản nháp',
      semesterLabel: '',
      itemTitle: String(item.title || '').trim() || `Mốc #${itemIndex + 1}`,
      itemIndex,
      plannedDate: item.plannedDate,
      plannedEndDate: item.plannedEndDate,
      canonicalVenue,
      locationLabel: raw,
      submittedAt,
    });
    if (entry) candidates.push(entry);
  });
  return candidates;
};

const attachConflictsToTimeline = async (doc, formatted) => {
  if (!doc || !formatted) return formatted;
  await loadRegistry();
  const submittedAt = new Date(doc.submittedAt || doc.createdAt || 0).getTime();
  const timelineId = String(doc._id || formatted.id);

  const selfCandidates = buildCandidatesFromFormItems(doc.items || [], {
    timelineId,
    submittedAt,
  });
  const registryOthers = registryCache.items.filter((e) => e.timelineId !== timelineId);
  const allCandidates = [...registryOthers, ...selfCandidates];

  formatted.items = (formatted.items || []).map((item, index) => {
    const { canonicalVenue } = normalizeEventVenue(item.location);
    const range = resolveTimeRange(item.plannedDate, item.plannedEndDate);
    if (!canonicalVenue || !range) {
      return { ...item, locationConflicts: [], hasLocationConflict: false };
    }
    const overlaps = findOverlappingHolds({
      canonicalVenue,
      range,
      excludeTimelineId: timelineId,
      excludeItemIndex: index,
      candidates: allCandidates,
      currentSubmittedAt: submittedAt,
    });
    return {
      ...item,
      locationConflicts: overlaps.map((e) => ({
        ...formatConflictEntry(e, submittedAt),
        isSameTimeline: e.timelineId === timelineId,
      })),
      hasLocationConflict: overlaps.length > 0,
    };
  });

  formatted.hasLocationConflict = formatted.items.some((item) => item.hasLocationConflict);
  formatted.locationConflictCount = formatted.items.filter((item) => item.hasLocationConflict).length;
  return formatted;
};

const checkItemConflicts = async ({
  location,
  plannedDate,
  plannedEndDate,
  excludeTimelineId,
  excludeItemIndex,
  submittedAt,
  siblingItems = [],
}) => {
  await loadRegistry();
  const { canonicalVenue } = normalizeEventVenue(location);
  const range = resolveTimeRange(plannedDate, plannedEndDate);
  if (!canonicalVenue || !range) {
    return { conflicts: [], hasLocationConflict: false, canonicalVenue };
  }

  const currentSubmittedAt = submittedAt ? new Date(submittedAt).getTime() : Date.now();
  const formCandidates = buildCandidatesFromFormItems(siblingItems, {
    timelineId: excludeTimelineId || 'draft',
    submittedAt: currentSubmittedAt,
  });
  const registryOthers = registryCache.items.filter(
    (e) => !excludeTimelineId || e.timelineId !== String(excludeTimelineId)
  );
  const overlaps = findOverlappingHolds({
    canonicalVenue,
    range,
    excludeTimelineId: excludeTimelineId || 'draft',
    excludeItemIndex,
    candidates: [...registryOthers, ...formCandidates],
    currentSubmittedAt,
  });

  return {
    conflicts: overlaps.map((e) => formatConflictEntry(e, currentSubmittedAt)),
    hasLocationConflict: overlaps.length > 0,
    canonicalVenue,
  };
};

const checkEventVenueConflicts = async ({
  location,
  startDate,
  endDate,
  excludeEventId,
  excludeTimelineId,
  excludeItemIndex,
}) => {
  await loadRegistry();
  const { canonicalVenue } = normalizeEventVenue(location);
  const range = resolveTimeRange(startDate, endDate);
  if (!canonicalVenue || !range) {
    return { conflicts: [], hasLocationConflict: false };
  }
  const overlaps = findOverlappingHolds({
    canonicalVenue,
    range,
    excludeTimelineId,
    excludeItemIndex,
    candidates: registryCache.items,
    currentSubmittedAt: Date.now(),
  });
  return {
    conflicts: overlaps.map((e) => formatConflictEntry(e, Date.now())),
    hasLocationConflict: overlaps.length > 0,
    canonicalVenue,
    excludeEventId: excludeEventId || null,
  };
};

const previewFormConflicts = async ({ items = [], excludeTimelineId, submittedAt }) => {
  const currentSubmittedAt = submittedAt ? new Date(submittedAt).getTime() : Date.now();
  await loadRegistry();
  const registryOthers = registryCache.items.filter(
    (e) => !excludeTimelineId || e.timelineId !== String(excludeTimelineId)
  );
  const formCandidates = buildCandidatesFromFormItems(items, {
    timelineId: excludeTimelineId || 'draft',
    submittedAt: currentSubmittedAt,
  });

  const results = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const { canonicalVenue } = normalizeEventVenue(item.location);
    const range = resolveTimeRange(item.plannedDate, item.plannedEndDate);
    if (!canonicalVenue || !range) {
      results.push({ index: i, conflicts: [], hasLocationConflict: false, canonicalVenue });
      continue;
    }

    const siblings = formCandidates.filter((c) => c.itemIndex !== i);
    const overlaps = findOverlappingHolds({
      canonicalVenue,
      range,
      excludeTimelineId: excludeTimelineId || 'draft',
      excludeItemIndex: i,
      candidates: [...registryOthers, ...siblings],
      currentSubmittedAt,
    });

    results.push({
      index: i,
      conflicts: overlaps.map((e) => formatConflictEntry(e, currentSubmittedAt)),
      hasLocationConflict: overlaps.length > 0,
      canonicalVenue,
    });
  }
  return results;
};

module.exports = {
  attachConflictsToTimeline,
  checkItemConflicts,
  checkEventVenueConflicts,
  previewFormConflicts,
  invalidateRegistryCache,
  loadRegistry,
};
