export const PARTNER_SIDEBAR_KEY = 'partnerSidebarOpen';

export const PARTNER_NAV_ITEMS = [
  { path: '/partner/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
  { path: '/partner/profile', label: 'Hồ sơ & Cài đặt', icon: 'profile' },
  { path: '/partner/events', label: 'Quản lý sự kiện', section: 'SỰ KIỆN', icon: 'publish' },
  { path: '/partner/announcements', label: 'Thông báo', icon: 'reports' },
  { path: '/partner/proposals/create', label: 'Tạo sự kiện mới', icon: 'create' },
  { path: '/partner/contracts', label: 'Hợp đồng', section: 'TÀI CHÍNH', icon: 'partners' },
  { path: '/partner/analytics', label: 'Phân tích báo cáo', icon: 'reports' }
];

export const readPartnerSidebarPref = () => {
  try {
    const v = sessionStorage.getItem(PARTNER_SIDEBAR_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return window.innerWidth >= 1024;
};

export const persistPartnerSidebarOpen = (open) => {
  try {
    sessionStorage.setItem(PARTNER_SIDEBAR_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
};

export const isPartnerDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

export const isPartnerNavActive = (path, pathname) => {
  if (path === '/partner/dashboard') {
    return pathname === '/partner/dashboard';
  }
  if (path === '/partner/profile') {
    return pathname === '/partner/profile' || pathname.startsWith('/partner/profile/');
  }
  if (path === '/partner/events') {
    return pathname === '/partner/events' || pathname.startsWith('/partner/events/');
  }
  if (path === '/partner/announcements') {
    return pathname.startsWith('/partner/announcements');
  }
  if (path === '/partner/proposals/create') {
    return pathname.startsWith('/partner/proposals');
  }
  if (path === '/partner/analytics') {
    return pathname === '/partner/analytics' || pathname.startsWith('/partner/analytics/');
  }
  return pathname === path || pathname.startsWith(`${path}/`);
};
