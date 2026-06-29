/**
 * Hiển thị media sự kiện — list dùng coverUrl lazy-load, detail vẫn có thể dùng base64.
 */

import { API_BASE } from './api';

const DEFAULT_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';

export const resolveEventCoverUrl = (eventOrId) => {
  const id = typeof eventOrId === 'object'
    ? String(eventOrId?._id || eventOrId?.id || '')
    : String(eventOrId || '');
  if (!id) return '';
  const base = API_BASE || '';
  return `${base}/api/events/${id}/cover`;
};

const resolveAbsoluteUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE || '';
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
};

const isUsableImageSrc = (value) =>
  typeof value === 'string' &&
  (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/'));

export const resolveEventDisplayImage = (event, fallback = DEFAULT_EVENT_IMAGE) => {
  if (event?.coverUrl) return resolveAbsoluteUrl(event.coverUrl);
  if (event?.hasCover && (event?._id || event?.id)) {
    return resolveEventCoverUrl(event);
  }
  if (isUsableImageSrc(event?.thumbnail)) {
    return resolveAbsoluteUrl(event.thumbnail);
  }
  if (isUsableImageSrc(event?.image)) {
    return resolveAbsoluteUrl(event.image);
  }
  return fallback;
};

export const resolveSpeakerAvatarUrl = (event, index, fallbackAvatar = '') => {
  const speaker = Array.isArray(event?.speakers) ? event.speakers[index] : null;
  const avatarUrl = speaker?.avatarUrl || '';
  if (avatarUrl) return resolveAbsoluteUrl(avatarUrl);
  const id = String(event?._id || event?.id || '');
  const exts = Array.isArray(event?.speakerAvatarExts) ? event.speakerAvatarExts : [];
  if (id && exts[index]) {
    return resolveAbsoluteUrl(`/api/events/${id}/speakers/${index}/avatar`);
  }
  if (isUsableImageSrc(fallbackAvatar)) return resolveAbsoluteUrl(fallbackAvatar);
  if (isUsableImageSrc(speaker?.avatar)) return resolveAbsoluteUrl(speaker.avatar);
  if (index === 0 && isUsableImageSrc(event?.speakerAvatar)) {
    return resolveAbsoluteUrl(event.speakerAvatar);
  }
  return '';
};
