import { isClubManagerRole } from '../utils/auth';

export const studentMenuSections = [
  {
    items: [{ key: 'profile', labelKey: 'student.menu.profile', path: '/profile', icon: 'user' }],
  },
  {
    headerKey: 'student.section.events',
    items: [
      { key: 'my-events', labelKey: 'student.menu.myEvents', path: '/my-events', icon: 'folder' },
      { key: 'my-clubs', labelKey: 'student.menu.myClubs', path: '/my-clubs', icon: 'users' },
      { key: 'schedule', labelKey: 'student.menu.schedule', path: '/schedule', icon: 'calendar' },
    ],
  },
  {
    headerKey: 'student.section.utilities',
    items: [
      { key: 'reviews', labelKey: 'student.menu.reviews', path: '/event-reviews', icon: 'star' },
      { key: 'settings', labelKey: 'student.menu.settings', path: '/settings', icon: 'settings' },
    ],
  },
];

export const getSidebarMenuSections = (role = null) => {
  if (!isClubManagerRole(role)) {
    return studentMenuSections;
  }

  return studentMenuSections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.key === 'my-clubs'
        ? { key: 'club-manage', labelKey: 'student.menu.clubManage', path: '/quan-ly-clb', icon: 'users' }
        : item
    ),
  }));
};
