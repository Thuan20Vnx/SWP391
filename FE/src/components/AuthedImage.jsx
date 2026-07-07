import { useEffect, useState } from 'react';
import { getAuthHeaders } from '../utils/api';

/**
 * Ảnh cho tài nguyên cần xác thực (vd cover sự kiện CHƯA duyệt: /api/events/:id/cover).
 * Thẻ <img> thường không gửi được Bearer token nên bị 404; component này fetch kèm
 * header auth rồi hiển thị qua object URL. Với ảnh công khai (data:/http ngoài, hoặc
 * URL không phải /api) thì dùng trực tiếp như <img> bình thường.
 */
const needsAuthFetch = (src) =>
  typeof src === 'string' && src.includes('/api/') && !src.startsWith('data:');

const AuthedImage = ({ src, alt = '', fallback = '', className = '', loading = 'lazy', ...rest }) => {
  const [resolvedSrc, setResolvedSrc] = useState(needsAuthFetch(src) ? '' : src || fallback);

  useEffect(() => {
    if (!needsAuthFetch(src)) {
      setResolvedSrc(src || fallback);
      return undefined;
    }
    let objectUrl = '';
    let cancelled = false;
    fetch(src, { headers: getAuthHeaders(false) })
      .then((res) => {
        if (!res.ok) throw new Error(`cover ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      })
      .catch(() => {
        // Authed-fetch có thể fail khi endpoint 302 redirect sang CDN (Cloudinary):
        // đọc blob cross-origin bị CORS chặn. Thẻ <img> render thẳng thì không bị
        // chặn — để <img> tự tải src (follow redirect), lỗi thật mới về fallback.
        if (!cancelled) setResolvedSrc(src);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, fallback]);

  return (
    <img
      src={resolvedSrc || fallback}
      alt={alt}
      className={className}
      loading={loading}
      onError={(e) => {
        if (fallback && e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
        }
      }}
      {...rest}
    />
  );
};

export default AuthedImage;
