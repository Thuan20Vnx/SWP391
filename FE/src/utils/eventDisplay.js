/**
 * Code First — hiển thị media sự kiện (banner CTSV lưu ở image)
 */

import { loadSettings } from '../hooks/useSettingsPreferences';

const DEFAULT_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';

export const resolveEventDisplayImage = (event, fallback = DEFAULT_EVENT_IMAGE) =>
  event?.image || event?.thumbnail || fallback;

export const formatEventDateLabel = (dateInput, language) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const lang = language || loadSettings().language || 'vi';
  return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatEventLocationLabel = (location, language) => {
  if (!location) return location;
  const lang = language || loadSettings().language || 'vi';
  if (lang !== 'en') return location;
  return String(location)
    .replace(/\bTầng\b/gi, 'Floor')
    .replace(/\btòa\b/gi, 'Building')
    .replace(/\bTòa\b/g, 'Building')
    .replace(/\bHội trường\b/gi, 'Hall')
    .replace(/\bSảnh\b/gi, 'Lobby');
};

export const isFreePriceLabel = (label) =>
  !label || label === 'MIỄN PHÍ' || label === 'FREE';
