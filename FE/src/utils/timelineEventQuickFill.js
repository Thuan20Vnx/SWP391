import { normalizeEventCategory } from '../constants/eventCategories';
import { EMPTY_EVENT_FORM, splitDateTimeFields } from './eventFormState';
import { DEFAULT_EVENT_TICKETS } from './eventTicketTypes';

export const normalizeTitleKey = (value) => String(value || '').trim().toLowerCase();

export const findEventForTimelineItem = (item, events = []) => {
  const key = normalizeTitleKey(item?.title);
  if (!key) return null;
  return events.find((ev) => normalizeTitleKey(ev.title) === key) || null;
};

export const collectApprovedTimelineItems = (timelines = []) => {
  const items = [];

  for (const timeline of timelines) {
    if (timeline.statusKey !== 'approved') continue;

    const pendingChange = timeline.changeRequest?.statusKey;
    if (pendingChange && ['pending_icpdp', 'pending_admin'].includes(pendingChange)) continue;

    (timeline.items || []).forEach((item, index) => {
      if (!String(item.title || '').trim()) return;
      items.push({
        ...item,
        timelineId: timeline.id,
        semesterLabel: timeline.semesterLabel,
        itemIndex: index,
        key: `${timeline.id}-${index}-${normalizeTitleKey(item.title)}`,
      });
    });
  }

  return items.sort((a, b) => {
    const dateA = a.plannedDate ? new Date(a.plannedDate).getTime() : Number.MAX_SAFE_INTEGER;
    const dateB = b.plannedDate ? new Date(b.plannedDate).getTime() : Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });
};

export const mapTimelineItemToEventForm = (item, baseForm = EMPTY_EVENT_FORM) => {
  const category = normalizeEventCategory(item.category) || item.category || 'Workshop';
  const capacity = Math.max(1, Number(item.expectedAttendees) || Number(baseForm.maxSlots) || 100);
  const planned = item.plannedDate ? new Date(item.plannedDate) : null;
  const plannedEnd = item.plannedEndDate ? new Date(item.plannedEndDate) : null;
  const hasPlannedDate = planned && !Number.isNaN(planned.getTime());

  const eventStart = hasPlannedDate ? planned : null;
  let eventEnd = null;
  if (eventStart) {
    if (plannedEnd && !Number.isNaN(plannedEnd.getTime()) && plannedEnd > eventStart) {
      eventEnd = plannedEnd;
    } else {
      eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
    }
  }

  const regStart = new Date();
  regStart.setMinutes(0, 0, 0);

  let regEnd = null;
  if (eventStart) {
    regEnd = new Date(eventStart);
    regEnd.setDate(regEnd.getDate() - 1);
    regEnd.setHours(23, 59, 0, 0);
  }

  const evStart = splitDateTimeFields(eventStart?.toISOString());
  const evEnd = splitDateTimeFields(eventEnd?.toISOString());
  const regStartFields = splitDateTimeFields(regStart.toISOString());
  const regEndFields = splitDateTimeFields(regEnd?.toISOString());

  const primaryQty = Math.max(1, Math.floor(capacity * 0.8));
  const ticketTypes = DEFAULT_EVENT_TICKETS.map((ticket, index) => ({
    ...ticket,
    qty: index === 0 ? primaryQty : Math.max(0, capacity - primaryQty),
  }));

  const descriptionParts = [item.description, item.notes].filter((part) => String(part || '').trim());

  return {
    ...baseForm,
    title: item.title || '',
    category,
    description: descriptionParts.join('\n\n') || baseForm.description,
    location: item.location || baseForm.location,
    maxSlots: capacity,
    ticketTypes,
    regStartDate: regStartFields.date,
    regStartTime: regStartFields.time,
    regEndDate: regEndFields.date,
    regEndTime: regEndFields.time,
    eventStartDate: evStart.date,
    eventStartTime: evStart.time,
    eventEndDate: evEnd.date,
    eventEndTime: evEnd.time,
  };
};

export const formatTimelineItemDate = (value) => {
  if (!value) return 'Chưa có ngày';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có ngày';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
