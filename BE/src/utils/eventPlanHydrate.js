const Event = require('../models/Event');
const EventProposal = require('../models/EventProposal');

const PLAN_FIELDS = 'eventPlanFile eventPlanFileName eventPlanFileMime eventPlanLink';

const mergePlanFields = (target, source) => {
  if (!source) return target;
  const out = { ...target };
  if (!out.eventPlanFile && source.eventPlanFile) {
    out.eventPlanFile = source.eventPlanFile;
    out.eventPlanFileName = source.eventPlanFileName || '';
    out.eventPlanFileMime = source.eventPlanFileMime || '';
  }
  if (!out.eventPlanLink && source.eventPlanLink) {
    out.eventPlanLink = source.eventPlanLink;
  }
  return out;
};

const hydrateProposalPlanFromLinkedEvent = async (proposalDoc) => {
  const payload = proposalDoc?.toObject ? proposalDoc.toObject() : { ...proposalDoc };
  if (!payload?.linkedEventId) return payload;

  const linked = await Event.findById(payload.linkedEventId).select(PLAN_FIELDS).lean();
  if (!linked) return payload;

  return mergePlanFields(payload, linked);
};

const hydrateEventsPlanFromProposals = async (events) => {
  if (!Array.isArray(events) || !events.length) return events;

  const needsHydrate = events.filter((e) => !e.eventPlanFile && !e.eventPlanLink);
  if (!needsHydrate.length) return events;

  const proposalIds = [
    ...new Set(needsHydrate.map((e) => e.proposalId).filter(Boolean).map((id) => String(id))),
  ];
  const eventIds = needsHydrate.map((e) => e._id).filter(Boolean);

  const [byIdProps, byLinkProps] = await Promise.all([
    proposalIds.length
      ? EventProposal.find({ _id: { $in: proposalIds } }).select(PLAN_FIELDS).lean()
      : [],
    eventIds.length
      ? EventProposal.find({ linkedEventId: { $in: eventIds } })
          .select(`linkedEventId ${PLAN_FIELDS}`)
          .lean()
      : [],
  ]);

  const byIdMap = new Map(byIdProps.map((p) => [String(p._id), p]));
  const byLinkMap = new Map(byLinkProps.map((p) => [String(p.linkedEventId), p]));

  return events.map((ev) => {
    if (ev.eventPlanFile || ev.eventPlanLink) return ev;
    let merged = { ...ev };
    if (ev.proposalId) {
      merged = mergePlanFields(merged, byIdMap.get(String(ev.proposalId)));
    }
    if (!merged.eventPlanFile && !merged.eventPlanLink) {
      merged = mergePlanFields(merged, byLinkMap.get(String(ev._id)));
    }
    return merged;
  });
};

module.exports = {
  hydrateProposalPlanFromLinkedEvent,
  hydrateEventsPlanFromProposals,
  mergePlanFields,
};
