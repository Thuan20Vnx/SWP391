import { loadSettings } from '../hooks/useSettingsPreferences';

const getLocale = (language) => {
  const lang = language || loadSettings().language || 'vi';
  return lang === 'en' ? 'en-US' : 'vi-VN';
};

export const formatAdminDate = (date, language) =>
  date.toLocaleDateString(getLocale(language), { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatAdminTime = (date, language) =>
  date.toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit', hour12: false });

export const formatAdminDateTime = (date, language) => {
  const locale = getLocale(language);
  const time = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${time}, ${formatAdminDate(date, language)}`;
};

export const formatMonthYear = (date, language) => {
  const locale = getLocale(language);
  const month = date.toLocaleDateString(locale, { month: 'long' });
  const year = date.getFullYear();
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
};

export const formatMonthYearShort = (date, language) => {
  const lang = language || loadSettings().language || 'vi';
  const m = date.getMonth() + 1;
  return lang === 'en' ? `Month ${m}/${date.getFullYear()}` : `Tháng ${m}/${date.getFullYear()}`;
};

export const formatRelativeSeconds = (seconds, language) => {
  const lang = language || loadSettings().language || 'vi';
  if (lang === 'en') {
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (seconds < 5) return 'vừa xong';
  if (seconds < 60) return `${seconds} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

export const secondsSince = (isoDate, now = new Date()) => {
  if (!isoDate) return 0;
  const then = isoDate instanceof Date ? isoDate : new Date(isoDate);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
};

export const formatLatency = (ms) => {
  if (ms == null || Number.isNaN(Number(ms))) return '—';
  return `${Math.round(Number(ms))}ms`;
};

export const formatHourRange = (hourStart) => {
  const pad = (n) => String(n).padStart(2, '0');
  const end = (hourStart + 1) % 24;
  return `${pad(hourStart)}:00 – ${pad(end)}:00`;
};

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

export const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);
