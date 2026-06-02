export const SIDEBAR_KEY = 'adminSidebarOpen';
export const DESKTOP_MQ = '(min-width: 1024px)';

export const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;

/** Mặc định đóng — chỉ mở sau khi người dùng bấm menu (hoặc đã mở trong phiên). */
export const readSidebarPref = () => {
  try {
    const v = sessionStorage.getItem(SIDEBAR_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* ignore */
  }
  return false;
};

export const writeSidebarPref = (open) => {
  try {
    sessionStorage.setItem(SIDEBAR_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
};
