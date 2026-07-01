export const CLUB_SIDEBAR_KEY = 'clubSidebarOpen';
export const CLUB_PUBLIC_SIDEBAR_KEY = 'clubPublicSidebarOpen';
export const CLUB_SIDEBAR_MODE_KEY = 'clubSidebarMode';

export const CLUB_SIDEBAR_MODE = {
  MANAGE: 'manage',
  PARTICIPATE: 'participate',
};

export const CLUB_NAV_ITEMS = [
  { key: 'profile', label: 'Hồ sơ CLB', mobileLabel: 'Hồ sơ CLB', icon: 'profile' },
  { key: 'transfer-chairman', label: 'Chuyển nhượng Chủ nhiệm', mobileLabel: 'Chuyển CN', icon: 'transfer' },
  {
    key: 'semester-timeline',
    label: 'Timeline mỗi kỳ',
    mobileLabel: 'Timeline mỗi kỳ',
    section: 'KẾ HOẠCH KỲ',
    icon: 'calendar',
  },
  {
    key: 'create',
    label: 'Tạo đề xuất sự kiện',
    mobileLabel: 'Tạo đề xuất',
    section: 'SỰ KIỆN',
    icon: 'create',
  },
  { key: 'list', label: 'Danh sách Sự kiện quản lý', mobileLabel: 'DS sự kiện', icon: 'publish' },
  { key: 'participants', label: 'Xem danh sách người tham gia', mobileLabel: 'Danh sách tham gia', icon: 'participants' },
  { key: 'report', label: 'Báo cáo sau sự kiện', mobileLabel: 'Báo cáo SK', section: 'THEO DÕI', icon: 'reports' },
  { key: 'notifications', label: 'Thông báo xét duyệt', mobileLabel: 'Xét duyệt', icon: 'approval' },
  { key: 'announcements', label: 'Đăng thông báo CLB', mobileLabel: 'Thông báo CLB', icon: 'broadcast' },
  { key: 'dashboard', label: 'Dashboard Thống kê số liệu', mobileLabel: 'Dashboard', icon: 'dashboard' },
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

export const inferClubSidebarMode = (pathname = '') => (
  String(pathname).startsWith('/quan-ly-clb')
    ? CLUB_SIDEBAR_MODE.MANAGE
    : CLUB_SIDEBAR_MODE.PARTICIPATE
);

export const readClubSidebarMode = (pathname = '') => {
  try {
    const saved = sessionStorage.getItem(CLUB_SIDEBAR_MODE_KEY);
    if (saved === CLUB_SIDEBAR_MODE.MANAGE || saved === CLUB_SIDEBAR_MODE.PARTICIPATE) {
      return saved;
    }
  } catch { /* ignore */ }
  return inferClubSidebarMode(pathname);
};

export const persistClubSidebarMode = (mode) => {
  try { sessionStorage.setItem(CLUB_SIDEBAR_MODE_KEY, mode); } catch { /* ignore */ }
};

export const isClubDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
export const isClubNavActive = (key, activeNav) => activeNav === key;

export const CLUB_PORTAL_HOME_NAV = 'list';

export const resolveClubActiveNav = (pathname) => {
  if (pathname.startsWith('/quan-ly-clb/announcements')) return 'announcements';
  if (pathname.startsWith('/quan-ly-clb/su-kien')) return 'list';
  try {
    const saved = sessionStorage.getItem('clb_active_nav');
    if (
      saved
      && saved !== 'create'
      && CLUB_NAV_ITEMS.some((item) => item.key === saved)
    ) {
      return saved;
    }
  } catch { /* ignore */ }
  return CLUB_PORTAL_HOME_NAV;
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

  if (key === 'create') {
    navigate('/quan-ly-clb', {
      state: { freshCreate: true },
      replace: pathname === '/quan-ly-clb',
    });
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

/** Header / menu chính — luôn mở trang danh sách sự kiện, không nhớ tab "Tạo đề xuất" */
export const navigateClubPortalHome = (navigate, pathname = '', options = {}) => {
  const { keepSidebarOpen = false } = options;

  try {
    sessionStorage.setItem('clb_active_nav', CLUB_PORTAL_HOME_NAV);
  } catch { /* ignore */ }

  const alreadyOnPortal = String(pathname || '').startsWith('/quan-ly-clb');

  if (keepSidebarOpen) {
    persistClubSidebarOpen(true);
    persistClubPublicSidebarOpen(true);
  }

  navigate('/quan-ly-clb', {
    state: keepSidebarOpen
      ? { clubPortalHome: true, keepSidebarOpen: true }
      : { clubPortalHome: true, closeSidebar: true },
    replace: alreadyOnPortal,
  });

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
};
