import { resolveMediaUrl } from './mediaUrls';

/** Resize/compress image before upload to avoid payload limits */
export const isCustomUploadedAvatar = (value) =>
  typeof value === 'string' &&
  (value.startsWith('data:image/') || value.startsWith('/api/user/avatar/'));

/** Resolve avatar URL for <img> — supports stored file, data URI, and remote http(s). */
export const resolveUserAvatar = (user, fallback = '') => {
  if (!user) return fallback;
  const candidates = [user.picture, user.avatar, user.avatarUrl];
  for (const value of candidates) {
    if (!value || typeof value !== 'string') continue;
    if (value.startsWith('/api/')) return resolveMediaUrl(value);
    if (/^https?:\/\//i.test(value)) return value;
    if (isCustomUploadedAvatar(value)) {
      return value.startsWith('/api/') ? resolveMediaUrl(value) : value;
    }
  }
  return fallback;
};

export const compressImageFile = (file, maxSize = 512, quality = 0.85) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Không thể đọc ảnh'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsDataURL(file);
  });
