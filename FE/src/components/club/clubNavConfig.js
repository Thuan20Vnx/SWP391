export const CLUB_SIDEBAR_KEY = 'clubSidebarOpen';

export const CLUB_NAV_ITEMS = [
  { key: 'profile', label: 'Hồ sơ CLB', icon: 'profile' },
  {
    key: 'create',
    label: 'Tạo đề xuất sự kiện',
    section: 'SỰ KIỆN',
    icon: 'create'
  },
  { key: 'list', label: 'Danh sách Sự kiện quản lý', icon: 'publish' },
  { key: 'participants', label: 'Quản lý người tham gia', icon: 'participants' },
  {
    key: 'report',
    label: 'Báo cáo sau sự kiện',
    section: 'THEO DÕI',
    icon: 'reports'
  },
  { key: 'notifications', label: 'Thông báo xét duyệt', icon: 'notifications' },
  {
    key: 'announcements',
    label: 'Đăng thông báo CLB',
    icon: 'announce',
    external: '/quan-ly-clb/announcements'
  },
  { key: 'dashboard', label: 'Dashboard Thống kê số liệu', icon: 'dashboard' }
];

export const readClubSidebarPref = () => {
  try {
    const v = sessionStorage.getItem(CLUB_SIDEBAR_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return window.innerWidth >= 1024;
};

export const persistClubSidebarOpen = (open) => {
  try {
    sessionStorage.setItem(CLUB_SIDEBAR_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
};

export const isClubDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

export const isClubNavActive = (key, activeNav) => activeNav === key;
