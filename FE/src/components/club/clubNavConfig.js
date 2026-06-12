export const CLUB_SIDEBAR_KEY = 'clubSidebarOpen';
export const CLUB_PUBLIC_SIDEBAR_KEY = 'clubPublicSidebarOpen';

export const CLUB_NAV_ITEMS = [
  { key: 'profile', label: 'Hồ sơ CLB', icon: 'profile' },
  { key: 'transfer-chairman', label: 'Chuyển nhượng Chủ nhiệm', icon: 'transfer' },
  { key: 'semester-timeline', label: 'Timeline Spring/Summer/Fall', section: 'KẾ HOẠCH KỲ', icon: 'calendar' },
  { key: 'create', label: 'Tạo đề xuất sự kiện', section: 'SỰ KIỆN', icon: 'create' },
  { key: 'list', label: 'Danh sách Sự kiện quản lý', icon: 'publish' },
  { key: 'participants', label: 'Quản lý người tham gia', icon: 'participants' },
  { key: 'report', label: 'Báo cáo sau sự kiện', section: 'THEO DÕI', icon: 'reports' },
  { key: 'notifications', label: 'Thông báo xét duyệt', icon: 'approval' },
  { key: 'announcements', label: 'Đăng thông báo CLB', icon: 'broadcast' },
  { key: 'dashboard', label: 'Dashboard Thống kê số liệu', icon: 'dashboard' },
];

export const readClubSidebarPref = () => {
  try {
    const v = sessionStorage.getItem(CLUB_SIDEBAR_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch { /* ignore */ }
  return false;
};

export const persistClubSidebarOpen = (open) => {
  try { sessionStorage.setItem(CLUB_SIDEBAR_KEY, open ? '1' : '0'); } catch { /* ignore */ }
};

export const readClubPublicSidebarPref = () => {
  try {
    const v = sessionStorage.getItem(CLUB_PUBLIC_SIDEBAR_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch { /* ignore */ }
  return false;
};

export const persistClubPublicSidebarOpen = (open) => {
  try { sessionStorage.setItem(CLUB_PUBLIC_SIDEBAR_KEY, open ? '1' : '0'); } catch { /* ignore */ }
};

export const isClubDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
export const isClubNavActive = (key, activeNav) => activeNav === key;

export const resolveClubActiveNav = (pathname) => {
  if (pathname.startsWith('/quan-ly-clb/announcements')) return 'announcements';
  if (pathname.startsWith('/quan-ly-clb/su-kien')) return 'list';
  try {
    const saved = sessionStorage.getItem('clb_active_nav');
    if (saved && CLUB_NAV_ITEMS.some((item) => item.key === saved)) return saved;
  } catch { /* ignore */ }
  return 'list';
};

/** Sidebar cổng công khai — chỉ highlight khi đang ở /quan-ly-clb */
export const resolveClubPublicActiveNav = (pathname) => {
  if (!pathname.startsWith('/quan-ly-clb')) return '';
  return resolveClubActiveNav(pathname);
};

/** Điều hướng sidebar CLB — dùng chung portal /quan-ly-clb và cổng công khai */
export const navigateClubNavItem = ({
  key,
  navigate,
  pathname,
  onNotificationsRead,
}) => {
  if (key === 'announcements') {
    if (
      pathname !== '/quan-ly-clb/announcements' &&
      !pathname.startsWith('/quan-ly-clb/announcements/')
    ) {
      navigate('/quan-ly-clb/announcements');
    }
    return;
  }

  try {
    sessionStorage.setItem('clb_active_nav', key);
  } catch { /* ignore */ }

  if (key === 'notifications' && onNotificationsRead) {
    onNotificationsRead();
  }

  if (pathname !== '/quan-ly-clb') {
    navigate('/quan-ly-clb');
  }
};
