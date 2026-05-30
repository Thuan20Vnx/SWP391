const LOCALE = 'vi-VN';

export const formatAdminDate = (date) =>
  date.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatAdminTime = (date) =>
  date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });

export const formatAdminDateTime = (date) => {
  const time = date.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${time}, ${formatAdminDate(date)}`;
};

export const formatMonthYear = (date) => {
  const month = date.toLocaleDateString(LOCALE, { month: 'long' });
  const year = date.getFullYear();
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
};

export const formatMonthYearShort = (date) => {
  const m = date.getMonth() + 1;
  return `Tháng ${m}/${date.getFullYear()}`;
};

export const formatRelativeSeconds = (seconds) => {
  if (seconds < 5) return 'vừa xong';
  if (seconds < 60) return `${seconds} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

export const formatHourRange = (hourStart) => {
  const pad = (n) => String(n).padStart(2, '0');
  const end = (hourStart + 1) % 24;
  return `${pad(hourStart)}:00 – ${pad(end)}:00`;
};

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

export const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);
