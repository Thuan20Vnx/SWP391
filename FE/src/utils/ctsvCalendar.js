import { loadSettings } from '../hooks/useSettingsPreferences';

const SOURCE_COLORS = {
  school: { bg: 'rgba(234, 88, 12, 0.14)', border: '#ea580c', text: '#c2410c' },
  partner: { bg: 'rgba(124, 58, 237, 0.12)', border: '#7c3aed', text: '#6d28d9' },
  club: { bg: 'rgba(100, 116, 139, 0.12)', border: '#64748b', text: '#475569' }
};

const PENDING_KEYS = new Set(['pending_ctsv', 'pending_icpdp', 'revision', 'pending']);

const STATUS_COLORS = {
  rejected: { bg: 'rgba(239, 68, 68, 0.12)', border: '#dc2626', text: '#b91c1c' },
  ended: { bg: 'rgba(148, 163, 184, 0.18)', border: '#94a3b8', text: '#64748b' },
  draft: { bg: 'rgba(148, 163, 184, 0.14)', border: '#cbd5e1', text: '#64748b' }
};

export const WEEKDAYS_VI = ['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CN'];

const WEEKDAY_KEYS = [
  'admin.calendar.weekday.mon',
  'admin.calendar.weekday.tue',
  'admin.calendar.weekday.wed',
  'admin.calendar.weekday.thu',
  'admin.calendar.weekday.fri',
  'admin.calendar.weekday.sat',
  'admin.calendar.weekday.sun',
];

const SOURCE_LABEL_KEYS = {
  school: 'admin.calendar.filter.school',
  partner: 'admin.calendar.filter.partner',
  club: 'admin.calendar.filter.club',
};

const resolveLang = (language) => language || loadSettings().language || 'vi';

export const getCalendarWeekdays = (t, language) => {
  const lang = resolveLang(language);
  if (!t || lang === 'vi') return WEEKDAYS_VI;
  return WEEKDAY_KEYS.map((key) => t(key));
};

export const getCalendarSourceLabel = (source, t) => {
  if (!t) {
    return source === 'school' ? 'Cấp trường' : source === 'partner' ? 'Đối tác' : 'CLB';
  }
  return t(SOURCE_LABEL_KEYS[source] || SOURCE_LABEL_KEYS.club);
};

export const formatMonthLabel = (date, language) => {
  const lang = resolveLang(language);
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const parseEventDate = (ev) => {
  if (ev.startDate) {
    const d = new Date(ev.startDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (ev.date && typeof ev.date === 'string') {
    const parts = ev.date.split('/');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
};

export const mapCtsvCalendarEvent = (ev, t) => {
  const date = parseEventDate(ev);
  const source = ev.source || 'club';
  const colors = SOURCE_COLORS[source] || SOURCE_COLORS.club;
  const statusKey = ev.statusKey || '';
  const isPending = PENDING_KEYS.has(statusKey);
  let eventColors = colors;
  if (isPending) {
    eventColors = { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#b45309' };
  } else if (STATUS_COLORS[statusKey]) {
    eventColors = STATUS_COLORS[statusKey];
  }

  return {
    id: ev.id,
    title: ev.title,
    time: ev.time || '',
    location: ev.location || '',
    date,
    source,
    sourceLabel: getCalendarSourceLabel(source, t),
    status: ev.status,
    statusKey,
    isPending,
    colors: eventColors
  };
};

export const buildMonthCells = (viewDate, events, todayStart) => {
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const eventsInMonth = events.filter(
    (e) => e.date && e.date.getFullYear() === viewYear && e.date.getMonth() === viewMonth
  );

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(viewYear, viewMonth, day);
    const cellStart = startOfDay(cellDate);
    cells.push({
      day,
      date: cellDate,
      cellStart,
      events: eventsInMonth.filter((e) => e.date.getDate() === day),
      isToday: cellStart === todayStart,
      isPast: cellStart < todayStart,
      isFuture: cellStart > todayStart
    });
  }

  return { cells, eventsInMonth };
};
