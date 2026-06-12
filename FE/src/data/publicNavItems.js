export const PUBLIC_NAV_ITEMS = [
  { key: 'home', label: 'Trang chủ', path: '/', icon: 'home' },
  { key: 'events', label: 'Sự kiện', path: '/events', icon: 'ticket' },
  { key: 'clubs', label: 'Câu lạc bộ', path: '/clubs', icon: 'users' },
  { key: 'news', label: 'Tin tức', path: '/announcements', icon: 'news' },
];

export const isPublicNavItemActive = (key, pathname) => {
  switch (key) {
    case 'home':
      return pathname === '/';
    case 'events':
      return pathname === '/events' || pathname.startsWith('/events/');
    case 'clubs':
      return pathname === '/clubs' || pathname.startsWith('/clubs/');
    case 'news':
      return pathname.startsWith('/announcements');
    default:
      return false;
  }
};
