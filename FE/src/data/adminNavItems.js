/** Menu sidebar khi ICPDP vào /admin/system */
export const ICPDP_ADMIN_NAV_ITEMS = [
  { path: '/icpdp', labelKey: 'admin.nav.icpdpHome', icon: 'dashboard' },
  { sectionKey: 'admin.section.clubs' },
  { path: '/icpdp/club-registrations', labelKey: 'admin.nav.clubRegistrations', icon: 'accounts' },
  { path: '/icpdp/proposals', labelKey: 'admin.nav.eventApprovals', icon: 'events' },
  { sectionKey: 'admin.section.system' },
  { path: '/admin/system', labelKey: 'admin.nav.maintenance', icon: 'system' },
];

/** Menu sidebar admin */
export const ADMIN_NAV_ITEMS = [
  { path: '/admin', labelKey: 'admin.nav.dashboard', icon: 'dashboard', end: true },
  { path: '/admin/profile', labelKey: 'admin.nav.profile', icon: 'profile' },
  { path: '/admin/calendar', labelKey: 'admin.nav.calendar', icon: 'calendar' },
  { sectionKey: 'admin.section.eventsManage' },
  { path: '/admin/events/approved', labelKey: 'admin.nav.allEvents', icon: 'events' },
  { sectionKey: 'admin.section.management' },
  { path: '/admin/accounts', labelKey: 'admin.nav.accounts', icon: 'accounts' },
  { path: '/admin/system', labelKey: 'admin.nav.system', icon: 'system' },
  { path: '/admin/partners', labelKey: 'admin.nav.partners', icon: 'partners' },
  { path: '/admin/analytics', labelKey: 'admin.nav.analytics', icon: 'analytics' },
  { sectionKey: 'admin.section.events' },
  { path: '/admin/icpdp/club-registrations', labelKey: 'admin.nav.clubRegistrations', icon: 'accounts' },
  { path: '/admin/semester-timelines', labelKey: 'admin.nav.semesterTimelines', icon: 'calendar' },
  { path: '/admin/events', labelKey: 'admin.nav.eventApprovals', icon: 'events' },
];
