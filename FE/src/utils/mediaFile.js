import { getAuthHeaders } from './api';
import { resolveMediaUrl } from './mediaUrls';

export const isProtectedMediaUrl = (src) =>
  typeof src === 'string' && src.startsWith('/api/');

export const resolveProtectedMediaUrl = (src) => resolveMediaUrl(src);

export const openProtectedMedia = async (src, fileName = 'attachment') => {
  const resolved = resolveProtectedMediaUrl(src);
  if (!resolved) return;
  if (resolved.startsWith('data:') || /^https?:\/\//i.test(resolved)) {
    window.open(resolved, '_blank', 'noopener,noreferrer');
    return;
  }
  const res = await fetch(resolved, { headers: getAuthHeaders(false) });
  if (!res.ok) throw new Error('Không tải được tệp.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.click();
  URL.revokeObjectURL(url);
};
