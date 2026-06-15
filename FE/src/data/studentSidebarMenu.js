import { isClubManagerRole } from '../utils/auth';
import { isPublicNavItemActive, PUBLIC_NAV_ITEMS } from './publicNavItems';

export const studentMenuSections = [
  {
    items: [
      ...PUBLIC_NAV_ITEMS,
      { key: 'profile', label: 'Thông tin cá nhân', path: '/profile', icon: 'user' },
    ],
  },
  {
    header: 'Sự kiện',
    items: [
      { key: 'my-events', label: 'Sự kiện của tôi', path: '/my-events', icon: 'folder' },
      { key: 'my-clubs', label: 'Câu lạc bộ yêu thích', path: '/my-clubs', icon: 'users' },
      { key: 'schedule', label: 'Quản lý lịch trình', path: '/schedule', icon: 'calendar' },
    ],
  },
  {
    header: 'Tiện ích',
    items: [
      { key: 'reviews', label: 'Đánh giá sự kiện', path: '/event-reviews', icon: 'star' },
      { key: 'settings', label: 'Cài đặt và bảo mật', path: '/settings', icon: 'settings' },
    ],
  },
];

export const isStudentSidebarItemActive = (key, pathname) => {
  const path = String(pathname || '');

  if (path === '/profile' || path.startsWith('/profile/')) return key === 'profile';
  if (path === '/my-events') return key === 'my-events';
  if (path === '/my-clubs' || path.startsWith('/my-clubs/')) return key === 'my-clubs';
  if (path.startsWith('/quan-ly-clb')) return key === 'club-manage';
  if (path === '/schedule') return key === 'schedule';
  if (path.startsWith('/event-reviews')) return key === 'reviews';
  if (path === '/settings' || path.startsWith('/settings/')) return key === 'settings';
  if (path === '/quet-qr') return key === 'scan';

  return isPublicNavItemActive(key, pathname);
};

export const resolveStudentPublicActiveNav = (pathname = '') => {
  const path = String(pathname || '');

  if (path === '/profile' || path.startsWith('/profile/')) return 'profile';
  if (path === '/my-events') return 'my-events';
  if (path === '/my-clubs' || path.startsWith('/my-clubs/')) return 'my-clubs';
  if (path.startsWith('/quan-ly-clb')) return 'club-manage';
  if (path === '/schedule') return 'schedule';
  if (path.startsWith('/event-reviews')) return 'reviews';
  if (path === '/settings' || path.startsWith('/settings/')) return 'settings';
  if (path === '/quet-qr') return 'scan';
  if (path === '/' || path === '/home') return 'home';
  if (path === '/events' || path.startsWith('/events/')) return 'events';
  if (path === '/clubs' || path.startsWith('/clubs/')) return 'clubs';
  if (path.startsWith('/announcements')) return 'news';

  return '';
};

export const getSidebarMenuSections = (role = null) => {
  if (!isClubManagerRole(role)) {
    return studentMenuSections;
  }

  return studentMenuSections.map((section) => ({
    ...section,
    items: section.items.map((item) => (
      item.key === 'my-clubs'
        ? { key: 'club-manage', label: 'Quản lý CLB', path: '/quan-ly-clb', icon: 'users' }
        : item
    )),
  }));
};
