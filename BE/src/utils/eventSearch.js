const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSearchTerm = (value) => String(value || '').trim();

/** @returns {import('mongoose').FilterQuery<object>['$or'] | null} */
const buildEventTextSearchOr = (searchRaw) => {
  const q = normalizeSearchTerm(searchRaw);
  if (!q) return null;

  const re = new RegExp(escapeRegex(q), 'i');
  return [
    { title: re },
    { location: re },
    { category: re },
    { description: re },
    { schoolOrganizerRole: re },
  ];
};

/**
 * Gắn điều kiện tìm kiếm văn bản vào query Mongo (kèm tên CLB nếu khớp).
 * @param {object} baseQuery
 * @param {string} searchRaw
 * @param {{ Club: import('mongoose').Model }} deps
 */
const applyEventTextSearch = async (baseQuery, searchRaw, { Club }) => {
  const orClause = buildEventTextSearchOr(searchRaw);
  if (!orClause) return baseQuery;

  const q = normalizeSearchTerm(searchRaw);
  const re = new RegExp(escapeRegex(q), 'i');
  const matchingClubs = await Club.find({
    $or: [{ name: re }, { slug: re }],
  })
    .select('_id')
    .lean();

  if (matchingClubs.length) {
    orClause.push({ clubId: { $in: matchingClubs.map((club) => club._id) } });
  }

  return { $and: [baseQuery, { $or: orClause }] };
};

module.exports = {
  escapeRegex,
  normalizeSearchTerm,
  buildEventTextSearchOr,
  applyEventTextSearch,
};
