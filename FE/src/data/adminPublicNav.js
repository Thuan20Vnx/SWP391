/** Top header nav — admin trên trang public */

export const ADMIN_PUBLIC_NAV_ITEMS = [
  { key: 'home', labelKey: 'nav.home', to: '/' },
  { key: 'events', labelKey: 'nav.events', to: '/events' },
  { key: 'news', labelKey: 'nav.news', to: '/announcements' },
  { key: 'admin', labelKey: 'nav.admin', to: '/admin' },
];

export const isAdminPublicNavActive = (key, pathname) => {
  if (key === 'admin') {
    return pathname === '/admin' || pathname.startsWith('/admin/');
  }
  if (key === 'home') {
    return pathname === '/' || pathname.startsWith('/clubs');
  }
  if (key === 'events') return pathname.startsWith('/events');
  if (key === 'news') return pathname.startsWith('/announcements');
  return false;
};
