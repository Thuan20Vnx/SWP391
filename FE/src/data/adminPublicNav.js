/** Top header nav — admin trên trang public (Trang chủ = Hệ thống FPT, Sự kiện, Tin tức) */

export const ADMIN_PUBLIC_NAV_ITEMS = [
  { key: 'home', label: 'Trang chủ', to: '/' },
  { key: 'events', label: 'Sự kiện', to: '/events' },
  { key: 'news', label: 'Tin tức', to: '/announcements' },
  { key: 'admin', label: 'Quản trị viên', to: '/admin' },
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
