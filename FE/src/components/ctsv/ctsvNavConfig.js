export const SIDEBAR_KEY = 'ctsvSidebarOpen';

export const CTSV_NAV_ITEMS = [
  { path: '/ctsv/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
  { path: '/ctsv/profile', label: 'Hồ sơ', icon: 'profile' },
  { path: '/ctsv/partners', label: 'Duyệt đơn đối tác', mobileLabel: 'Duyệt đối tác', icon: 'partners' },
  {
    path: '/ctsv/events/create',
    label: 'Tạo sự kiện cấp trường',
    mobileLabel: 'Tạo sự kiện trường',
    section: 'SỰ KIỆN',
    icon: 'create',
  },
  { path: '/ctsv/events', label: 'Publish sự kiện', icon: 'publish' },
  { path: '/ctsv/all-events', label: 'Quản lý sự kiện', icon: 'calendar' },
  { path: '/ctsv/semester-timelines', label: 'Timeline kỳ học', icon: 'calendar' },
  { path: '/ctsv/announcements/publish', label: 'Thông báo chính thức', icon: 'announce' },
  { path: '/ctsv/calendar', label: 'Lịch toàn trường', icon: 'calendar' },
  { path: '/ctsv/reports', label: 'Báo cáo sau SK', icon: 'reports' }
];

export const readSidebarPref = () => {
  try {
    const v = sessionStorage.getItem(SIDEBAR_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return false;
};

export const persistSidebarOpen = (open) => {
  try {
    sessionStorage.setItem(SIDEBAR_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
};

/** Gọi sau khi đăng nhập CTSV — sidebar đóng mặc định. */
export const resetCtsvSidebarOnLogin = () => {
  persistSidebarOpen(false);
};

export const isCtsvDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

export const isCtsvNavActive = (path, pathname) => {
  if (path === '/ctsv/dashboard') return pathname === path;
  if (path === '/ctsv/profile') {
    return pathname === '/ctsv/profile' || pathname === '/profile';
  }
  if (path === '/ctsv/events') {
    return (
      pathname === '/ctsv/events' ||
      (pathname.startsWith('/ctsv/events/') && !pathname.includes('/create'))
    );
  }
  return pathname === path || pathname.startsWith(`${path}/`);
};
