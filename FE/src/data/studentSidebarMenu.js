export const studentMenuSections = [
  {
    items: [
      { key: 'profile', label: 'Thông tin cá nhân', path: '/profile', icon: 'user' },
    ],
  },
  {
    header: 'Sự kiện',
    items: [
      { key: 'my-events', label: 'Sự kiện của tôi', path: '/my-events', icon: 'folder' },
      { key: 'my-clubs', label: 'Câu lạc bộ của tôi', path: '/my-clubs', icon: 'users' },
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

export const getSidebarMenuSections = () => studentMenuSections;
