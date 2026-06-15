export const STUDENT_PUBLIC_SIDEBAR_KEY = 'studentPublicSidebarOpen';

export const STUDENT_NAV_ITEMS = [
  { path: '/', label: 'Trang chủ', icon: 'home' },
  { path: '/events', label: 'Sự kiện', icon: 'ticket' },
  { path: '/clubs', label: 'Câu lạc bộ', icon: 'participants' },
  { path: '/announcements', label: 'Tin tức', icon: 'announce' },
  { path: '/profile', label: 'Thông tin cá nhân', icon: 'profile' },
  {
    path: '/my-events',
    label: 'Sự kiện của tôi',
    section: 'SỰ KIỆN',
    icon: 'folder',
  },
  {
    path: '/my-clubs',
    label: 'CLB yêu thích',
    section: 'SỰ KIỆN',
    icon: 'participants',
  },
  {
    path: '/schedule',
    label: 'Quản lý lịch trình',
    section: 'SỰ KIỆN',
    icon: 'calendar',
  },
  {
    path: '/event-reviews',
    label: 'Đánh giá sự kiện',
    section: 'TIỆN ÍCH',
    icon: 'star',
  },
  {
    path: '/settings',
    label: 'Cài đặt và bảo mật',
    section: 'TIỆN ÍCH',
    icon: 'system',
  },
];

export const isStudentDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

export const readStudentPublicSidebarPref = () => {
  try {
    const value = sessionStorage.getItem(STUDENT_PUBLIC_SIDEBAR_KEY);
    if (value === '1') return true;
    if (value === '0') return false;
  } catch {
    /* ignore */
  }
  return false;
};

export const persistStudentPublicSidebarOpen = (open) => {
  try {
    sessionStorage.setItem(STUDENT_PUBLIC_SIDEBAR_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
};

/** Gọi sau khi đăng nhập sinh viên — sidebar đóng mặc định. */
export const resetStudentPublicSidebarOnLogin = () => {
  persistStudentPublicSidebarOpen(false);
};

export const isStudentNavActive = (path, pathname) => {
  const current = String(pathname || '');

  if (path === '/') return current === '/' || current === '/home';
  if (path === '/events') {
    return current === '/events' || current.startsWith('/events/');
  }
  if (path === '/clubs') {
    return current === '/clubs' || current.startsWith('/clubs/');
  }
  if (path === '/announcements') return current.startsWith('/announcements');
  if (path === '/profile') {
    return current === '/profile' || current.startsWith('/profile/');
  }
  if (path === '/my-events') return current === '/my-events';
  if (path === '/my-clubs') {
    return current === '/my-clubs' || current.startsWith('/my-clubs/');
  }
  if (path === '/schedule') return current === '/schedule';
  if (path === '/event-reviews') return current.startsWith('/event-reviews');
  if (path === '/settings') {
    return current === '/settings' || current.startsWith('/settings/');
  }

  return current === path || current.startsWith(`${path}/`);
};
