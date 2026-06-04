export const ICPDP_SIDEBAR_KEY = 'icpdpSidebarOpen';

export const ICPDP_NAV_ITEMS = [
  { path: '/icpdp/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
  { path: '/icpdp/profile', label: 'Hồ sơ', icon: 'profile' },
  { path: '/icpdp/proposals', label: 'Duyệt đề xuất CLB', section: 'QUẢN LÝ CLB', icon: 'publish' },
  { path: '/icpdp/events', label: 'Xem sự kiện', icon: 'calendar' },
  { path: '/icpdp/events/create', label: 'Tạo sự kiện cấp trường', section: 'SỰ KIỆN', icon: 'create' },
  { path: '/icpdp/calendar', label: 'Lịch toàn trường', icon: 'calendar' },
  { path: '/icpdp/reports', label: 'Báo cáo sau SK', icon: 'reports' },
  { path: '/icpdp/announcements', label: 'Thông báo CLB', icon: 'announce' },
  { path: '/admin/system', label: 'Bảo trì hệ thống', section: 'HỆ THỐNG', icon: 'system' }
];

export const readIcpdpSidebarPref = () => {
  try {
    const v = sessionStorage.getItem(ICPDP_SIDEBAR_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return window.innerWidth >= 1024;
};

export const persistIcpdpSidebarOpen = (open) => {
  try {
    sessionStorage.setItem(ICPDP_SIDEBAR_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
};

export const isIcpdpDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

export const isIcpdpNavActive = (path, pathname) => {
  if (path === '/icpdp/dashboard') return pathname === path;
  if (path === '/icpdp/profile') {
    return pathname === '/icpdp/profile' || pathname === '/profile';
  }
  if (path === '/icpdp/events/create') {
    return (
      pathname === '/icpdp/events/create' ||
      (pathname.startsWith('/icpdp/events/') && pathname.endsWith('/edit'))
    );
  }
  if (path === '/icpdp/events') {
    return (
      pathname === '/icpdp/events' ||
      (pathname.startsWith('/icpdp/events/') &&
        !pathname.includes('/create') &&
        !pathname.endsWith('/edit'))
    );
  }
  if (path === '/icpdp/proposals') {
    return pathname === '/icpdp/proposals' || pathname.startsWith('/icpdp/proposals/');
  }
  if (path === '/icpdp/announcements') {
    return pathname.startsWith('/icpdp/announcements');
  }
  if (path === '/admin/system') {
    return pathname === '/admin/system' || pathname.startsWith('/admin/system/');
  }
  return pathname === path || pathname.startsWith(`${path}/`);
};
