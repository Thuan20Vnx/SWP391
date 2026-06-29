const isBrowserLocalHost = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

/** localhost:5173 → Vite proxy (/api). LAN/phone → VITE_API_BASE */
export const API_MEDIA_BASE = (() => {
  if (import.meta.env.DEV && isBrowserLocalHost()) return '';
  const fromEnv = import.meta.env.VITE_API_BASE;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return import.meta.env.DEV ? '' : 'http://localhost:5000';
})();

export const resolveMediaUrl = (relativePath) => {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath) || relativePath.startsWith('data:')) {
    return relativePath;
  }
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return API_MEDIA_BASE ? `${API_MEDIA_BASE}${path}` : path;
};
