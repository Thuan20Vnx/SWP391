export const TIMELINE_LIVE_EVENT = 'portal:timeline-live-update';

/** @deprecated use TIMELINE_LIVE_EVENT */
export const ICPDP_TIMELINE_LIVE_EVENT = TIMELINE_LIVE_EVENT;

export const TIMELINE_LIVE_TYPES = new Set([
  'timeline_submit',
  'timeline_cancel',
  'timeline_change',
  'timeline_update',
  'timeline_revision',
  'timeline_approve',
  'timeline_reject',
]);

export const TIMELINE_LIVE_ROLES = new Set(['icpdp', 'admin', 'club_manager']);

export const isTimelineLiveType = (type) => TIMELINE_LIVE_TYPES.has(String(type || ''));

export const shouldDispatchTimelineLive = (role) =>
  TIMELINE_LIVE_ROLES.has(String(role || '').trim().toLowerCase());

export const dispatchTimelineLiveUpdate = (notification) => {
  if (!isTimelineLiveType(notification?.type)) return;
  window.dispatchEvent(new CustomEvent(TIMELINE_LIVE_EVENT, { detail: notification }));
};

export const isClubTimelineNav = (activeNav = '') => activeNav === 'semester-timeline';

export const isTimelineLiveRoute = (pathname = '') =>
  pathname.includes('/semester-timelines');
