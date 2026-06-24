export const ICPDP_TIMELINE_LIVE_EVENT = 'icpdp:timeline-live-update';

export const TIMELINE_LIVE_TYPES = new Set([
  'timeline_submit',
  'timeline_cancel',
  'timeline_change',
  'timeline_update',
  'timeline_revision',
  'timeline_approve',
  'timeline_reject',
]);

export const isTimelineLiveType = (type) => TIMELINE_LIVE_TYPES.has(String(type || ''));

export const dispatchTimelineLiveUpdate = (notification) => {
  if (!isTimelineLiveType(notification?.type)) return;
  window.dispatchEvent(new CustomEvent(ICPDP_TIMELINE_LIVE_EVENT, { detail: notification }));
};
