import { isClubManagerRole } from '../utils/auth';
import { PUBLIC_NAV_ITEMS } from './publicNavItems';

export const studentMenuSections = [
  {
    header: 'Khám phá',
    items: PUBLIC_NAV_ITEMS,
  },
  {
    items: [
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
