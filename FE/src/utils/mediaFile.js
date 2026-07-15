import { getAuthHeaders } from './api';
import { resolveMediaUrl } from './mediaUrls';

export const isProtectedMediaUrl = (src) =>
  typeof src === 'string' && src.startsWith('/api/');

export const resolveProtectedMediaUrl = (src) => resolveMediaUrl(src);

export const openProtectedMedia = async (src, fileName = 'attachment') => {
  const resolved = resolveProtectedMediaUrl(src);
  if (!resolved) return;
  // data: URL nhúng sẵn — mở trực tiếp.
  if (resolved.startsWith('data:')) {
    window.open(resolved, '_blank', 'noopener,noreferrer');
    return;
  }
  // http(s) (Cloudinary) hoặc /api: tải về Blob cùng origin. Với URL khác origin,
  // thuộc tính `download` bị bỏ qua nếu mở trực tiếp → file lấy tên từ Content-
  // Disposition của Cloudinary (= public_id, không đuôi). Qua Blob mới giữ đúng tên.
  const isRemote = /^https?:\/\//i.test(resolved);
  const res = await fetch(resolved, isRemote ? {} : { headers: getAuthHeaders(false) });
  if (!res.ok) throw new Error('Không tải được tệp.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const isImage =
    (blob.type || '').startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
  if (isImage) {
    // Ảnh: mở xem inline (blob same-origin), dọn sau khi tab mới kịp tải.
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
