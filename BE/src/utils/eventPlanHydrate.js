const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');
const {
  entityHasAnyPlanFile,
  sanitizeEventPlanForApi,
  PLAN_SCOPES,
  buildPlanUrl,
} = require('./eventPlanStorage');

const PLAN_META_FIELDS = 'eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink hasEventPlanFile hasEventPlan eventPlanUrl';

const mergePlanFields = (target, source) => {
  if (!source) return target;
  const out = { ...target };
  const sourceHasFile =
    source.hasEventPlanFile === true ||
    entityHasAnyPlanFile(source, PLAN_SCOPES.events) ||
    entityHasAnyPlanFile(source, PLAN_SCOPES.proposals);
  const targetHasFile =
    out.hasEventPlanFile === true ||
    entityHasAnyPlanFile(out, PLAN_SCOPES.proposals);

  if (!targetHasFile && sourceHasFile) {
    out.eventPlanFileName = source.eventPlanFileName || out.eventPlanFileName || '';
    out.eventPlanFileMime = source.eventPlanFileMime || out.eventPlanFileMime || '';
    out.eventPlanFileExt = source.eventPlanFileExt || out.eventPlanFileExt || '';
    out.hasEventPlanFile = true;
    out.hasEventPlan = true;
    out.eventPlanUrl =
      source.eventPlanUrl ||
      out.eventPlanUrl ||
      (source._id ? buildPlanUrl(PLAN_SCOPES.events, source._id) : '');
    out.eventPlanFile = '';
  }

  if (!out.eventPlanLink && source.eventPlanLink) {
    out.eventPlanLink = source.eventPlanLink;
    out.hasEventPlan = Boolean(out.hasEventPlanFile) || Boolean(out.eventPlanLink);
  }

  return out;
};

const hydrateProposalPlanFromLinkedEvent = async (proposalDoc) => {
  const payload = proposalDoc?.toObject ? proposalDoc.toObject() : { ...proposalDoc };
  if (entityHasAnyPlanFile(payload, PLAN_SCOPES.proposals)) {
    const plan = sanitizeEventPlanForApi(payload, PLAN_SCOPES.proposals);
    return { ...payload, ...plan, eventPlanFile: '' };
  }
  if (!payload?.linkedEventId) {
    const plan = sanitizeEventPlanForApi(payload, PLAN_SCOPES.proposals);
    return { ...payload, ...plan, eventPlanFile: '' };
  }

  const linked = await Event.findById(payload.linkedEventId)
    .select('eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink')
    .lean();
  if (!linked) {
    const plan = sanitizeEventPlanForApi(payload, PLAN_SCOPES.proposals);
    return { ...payload, ...plan, eventPlanFile: '' };
  }

  const merged = mergePlanFields(payload, {
    ...linked,
    eventPlanUrl: buildPlanUrl(PLAN_SCOPES.events, linked._id),
    hasEventPlanFile: entityHasAnyPlanFile(linked, PLAN_SCOPES.events),
    hasEventPlan:
      entityHasAnyPlanFile(linked, PLAN_SCOPES.events) || Boolean(String(linked.eventPlanLink || '').trim()),
  });
  const plan = sanitizeEventPlanForApi(merged, PLAN_SCOPES.proposals, {
    planUrlBuilder: () => buildPlanUrl(PLAN_SCOPES.events, linked._id),
  });
  return { ...merged, ...plan, eventPlanFile: '' };
};

const hydrateEventsPlanFromProposals = async (events) => {
  if (!Array.isArray(events) || !events.length) return events;

  const needsHydrate = events.filter(
    (e) => !entityHasAnyPlanFile(e, PLAN_SCOPES.events) && !e.eventPlanLink
  );
  if (!needsHydrate.length) return events;

  const proposalIds = [
    ...new Set(needsHydrate.map((e) => e.proposalId).filter(Boolean).map((id) => String(id))),
  ];
  const eventIds = needsHydrate.map((e) => e._id).filter(Boolean);

  const [byIdProps, byLinkProps] = await Promise.all([
    proposalIds.length
      ? EventProposal.find({ _id: { $in: proposalIds } })
          .select(`linkedEventId eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink`)
          .lean()
      : [],
    eventIds.length
      ? EventProposal.find({ linkedEventId: { $in: eventIds } })
          .select(`linkedEventId eventPlanFile eventPlanFileName eventPlanFileMime eventPlanFileExt eventPlanLink`)
          .lean()
      : [],
  ]);

  const byIdMap = new Map(byIdProps.map((p) => [String(p._id), p]));
  const byLinkMap = new Map(byLinkProps.map((p) => [String(p.linkedEventId), p]));

  return events.map((ev) => {
    if (entityHasAnyPlanFile(ev, PLAN_SCOPES.events) || ev.eventPlanLink) return ev;
    let merged = { ...ev };
    if (ev.proposalId) {
      merged = mergePlanFields(merged, byIdMap.get(String(ev.proposalId)));
    }
    if (!entityHasAnyPlanFile(merged, PLAN_SCOPES.events) && !merged.eventPlanLink) {
      merged = mergePlanFields(merged, byLinkMap.get(String(ev._id)));
    }
    const plan = sanitizeEventPlanForApi(merged, PLAN_SCOPES.events);
    return { ...merged, ...plan, eventPlanFile: '' };
  });
};

module.exports = {
  hydrateProposalPlanFromLinkedEvent,
  hydrateEventsPlanFromProposals,
  mergePlanFields,
  PLAN_META_FIELDS,
};
