const path = require('path');
const {
  isDataUri,
  parseDataUri,
  extensionFromMime,
  writeBufferToFile,
  readFileIfExists,
  deleteFileIfExists,
  findStoredFile,
} = require('./dataUriStorage');

const PLAN_SCOPES = {
  events: 'events',
  proposals: 'proposals',
  timelines: 'timelines',
};

const PLANS_ROOT = path.join(__dirname, '../../uploads/event-plans');

const planDirForScope = (scope) => path.join(PLANS_ROOT, scope);

const planFilePath = (scope, id, ext) =>
  path.join(planDirForScope(scope), `${String(id)}.${String(ext).replace(/^\./, '')}`);

const buildPlanUrl = (scope, id) => {
  const sid = String(id || '').trim();
  if (!sid) return '';
  if (scope === PLAN_SCOPES.events) return `/api/events/${sid}/plan`;
  if (scope === PLAN_SCOPES.proposals) return `/api/ctsv/proposals/${sid}/plan`;
  if (scope === PLAN_SCOPES.timelines) return `/api/ctsv/semester-timelines/${sid}/plan`;
  return '';
};

const buildClubTimelinePlanUrl = (id) =>
  `/api/clubs/manage/semester-timelines/${String(id)}/plan`;

const buildSchoolTimelinePlanUrl = (id) =>
  `/api/ctsv/school-semester-timelines/${String(id)}/plan`;

const hasStoredPlanFile = (scope, id, knownExt = '') =>
  Boolean(findStoredFile(planDirForScope(scope), id, knownExt));

const writePlanFromDataUri = async (scope, id, dataUri, mimeHint = '', fileName = '') => {
  const { mime, buffer } = parseDataUri(dataUri);
  const ext = extensionFromMime(mimeHint || mime, fileName, 'bin');
  const filePath = planFilePath(scope, id, ext);
  const existing = findStoredFile(planDirForScope(scope), id, '');
  if (existing && existing.filePath !== filePath) {
    deleteFileIfExists(existing.filePath);
  }
  await writeBufferToFile(filePath, buffer);
  return ext;
};

const entityHasStoredPlan = (doc, scope) => {
  const id = String(doc?._id || doc?.id || '');
  if (!id) return false;
  return Boolean(doc?.eventPlanFileExt) || hasStoredPlanFile(scope, id, doc?.eventPlanFileExt || '');
};

const entityHasAnyPlanFile = (doc, scope) =>
  entityHasStoredPlan(doc, scope) || isDataUri(doc?.eventPlanFile);

const sanitizeEventPlanForApi = (doc, scope, { planUrlBuilder } = {}) => {
  const id = String(doc?._id || doc?.id || '');
  const hasFile = entityHasAnyPlanFile(doc, scope);
  const buildUrl = planUrlBuilder || ((entityId) => buildPlanUrl(scope, entityId));
  const rawName = String(doc?.eventPlanFileName || '').trim();
  const eventPlanFileName = rawName.replace(/\.+(?=\.[a-z0-9]{2,8}$)/i, '');
  return {
    hasEventPlanFile: hasFile,
    hasEventPlan: hasFile || Boolean(String(doc?.eventPlanLink || '').trim()),
    eventPlanUrl: hasFile && id ? buildUrl(id) : '',
    eventPlanFileName,
    eventPlanFileMime: doc?.eventPlanFileMime || '',
    eventPlanLink: doc?.eventPlanLink || '',
    eventPlanFile: '',
  };
};

const persistEventPlanOnDocument = async (doc, scope) => {
  if (!doc?._id) return doc;
  const id = String(doc._id);
  const src = doc.eventPlanFile || '';

  if (isDataUri(src)) {
    const ext = await writePlanFromDataUri(
      scope,
      id,
      src,
      doc.eventPlanFileMime,
      doc.eventPlanFileName
    );
    doc.eventPlanFileExt = ext;
    doc.eventPlanFile = '';
    return doc;
  }

  if (src === '') {
    const stillHasPlanMeta =
      Boolean(String(doc.eventPlanFileName || '').trim()) ||
      Boolean(String(doc.eventPlanLink || '').trim());
    if (!stillHasPlanMeta && (doc.eventPlanFileExt || hasStoredPlanFile(scope, id))) {
      const existing = findStoredFile(planDirForScope(scope), id, doc.eventPlanFileExt || '');
      if (existing) deleteFileIfExists(existing.filePath);
      doc.eventPlanFileExt = '';
    }
  }

  return doc;
};

const resolvePlanResponse = async (doc, scope) => {
  const id = String(doc?._id || doc?.id || '');
  const stored = findStoredFile(planDirForScope(scope), id, doc?.eventPlanFileExt || '');
  if (stored) {
    const buffer = await readFileIfExists(stored.filePath);
    if (buffer) {
      return {
        buffer,
        mime: doc?.eventPlanFileMime || 'application/octet-stream',
        fileName: doc?.eventPlanFileName || `event-plan-${id}`,
      };
    }
  }

  if (isDataUri(doc?.eventPlanFile)) {
    const { mime, buffer } = parseDataUri(doc.eventPlanFile);
    return {
      buffer,
      mime: doc?.eventPlanFileMime || mime,
      fileName: doc?.eventPlanFileName || `event-plan-${id}`,
    };
  }

  return null;
};

const sendPlanFile = async (doc, scope, res) => {
  const resolved = await resolvePlanResponse(doc, scope);
  if (!resolved) {
    const err = new Error('Không tìm thấy file kế hoạch sự kiện');
    err.statusCode = 404;
    throw err;
  }

  const safeName = String(resolved.fileName || 'bang-ke-hoach-su-kien').replace(/[^\w.\-() ]+/g, '_');
  res.set('Content-Type', resolved.mime);
  res.set('Content-Disposition', `inline; filename="${safeName}"`);
  res.set('Cache-Control', 'private, max-age=3600');
  res.set('Content-Length', String(resolved.buffer.length));
  res.send(resolved.buffer);
};

const sendProposalPlan = async (proposalId, res, { EventModel } = {}) => {
  const Event = EventModel || require('../models/Event');
  const EventProposal = require('../models/EventProposal');
  const proposal = await EventProposal.findById(proposalId)
    .select('eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink linkedEventId')
    .lean();

  if (!proposal) {
    const err = new Error('Không tìm thấy file kế hoạch');
    err.statusCode = 404;
    throw err;
  }

  if (entityHasAnyPlanFile(proposal, PLAN_SCOPES.proposals)) {
    await sendPlanFile(proposal, PLAN_SCOPES.proposals, res);
    return;
  }

  if (proposal.linkedEventId) {
    const linked = await Event.findById(proposal.linkedEventId)
      .select('eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink')
      .lean();
    if (linked && entityHasAnyPlanFile(linked, PLAN_SCOPES.events)) {
      await sendPlanFile(linked, PLAN_SCOPES.events, res);
      return;
    }
  }

  const err = new Error('Không tìm thấy file kế hoạch');
  err.statusCode = 404;
  throw err;
};

module.exports = {
  PLAN_SCOPES,
  PLANS_ROOT,
  buildPlanUrl,
  buildClubTimelinePlanUrl,
  buildSchoolTimelinePlanUrl,
  hasStoredPlanFile,
  entityHasStoredPlan,
  entityHasAnyPlanFile,
  sanitizeEventPlanForApi,
  persistEventPlanOnDocument,
  resolvePlanResponse,
  sendPlanFile,
  sendProposalPlan,
  writePlanFromDataUri,
};
