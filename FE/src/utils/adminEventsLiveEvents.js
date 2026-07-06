export const PORTAL_EVENTS_LIVE_EVENT = 'portal:admin-events-live-update';

/** @deprecated use PORTAL_EVENTS_LIVE_EVENT */
export const ADMIN_EVENTS_LIVE_EVENT = PORTAL_EVENTS_LIVE_EVENT;

export const PORTAL_EVENTS_LIVE_TYPES = new Set([
  'event_submit',
  'event_resubmit',
  'event_approve',
  'event_reject',
  'event_revision',
  'event_change_submit',
  'event_change_approve',
  'event_change_reject',
  'partner_submit',
  'partner_reject',
  'partner_revision',
]);

/** @deprecated */
export const ADMIN_EVENTS_LIVE_TYPES = PORTAL_EVENTS_LIVE_TYPES;

export const PORTAL_EVENTS_LIVE_ROLES = new Set(['admin', 'ctsv', 'icpdp', 'club_manager', 'partner']);

/** @deprecated */
export const ADMIN_EVENTS_LIVE_ROLES = PORTAL_EVENTS_LIVE_ROLES;

export const isPortalEventsLiveType = (type) => PORTAL_EVENTS_LIVE_TYPES.has(String(type || ''));

/** @deprecated */
export const isAdminEventsLiveType = isPortalEventsLiveType;

export const shouldDispatchPortalEventsLive = (role) =>
  PORTAL_EVENTS_LIVE_ROLES.has(String(role || '').trim().toLowerCase());

/** @deprecated */
export const shouldDispatchAdminEventsLive = shouldDispatchPortalEventsLive;

export const dispatchPortalEventsLiveUpdate = (notification) => {
  if (!isPortalEventsLiveType(notification?.type)) return;
  window.dispatchEvent(new CustomEvent(PORTAL_EVENTS_LIVE_EVENT, { detail: notification }));
};

/** @deprecated */
export const dispatchAdminEventsLiveUpdate = dispatchPortalEventsLiveUpdate;

export const isAdminEventsApprovalRoute = (pathname = '') => isPortalEventsApprovalRoute(pathname);

export const isPortalEventsApprovalRoute = (pathname = '') => {
  const path = String(pathname || '');
  if (path === '/admin/events' || path.startsWith('/admin/ctsv/')) return true;
  if (path.startsWith('/icpdp/proposals') || path.startsWith('/icpdp/events')) return true;
  if (
    path.startsWith('/ctsv/proposals')
    || path.startsWith('/ctsv/events')
    || path.startsWith('/ctsv/partners')
  ) {
    return true;
  }
  return false;
};
