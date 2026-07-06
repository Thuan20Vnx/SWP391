const SOURCE_COLORS = {
  school: { bg: 'rgba(234, 88, 12, 0.14)', border: '#ea580c', text: '#c2410c' },
  partner: { bg: 'rgba(124, 58, 237, 0.12)', border: '#7c3aed', text: '#6d28d9' },
  club: { bg: 'rgba(100, 116, 139, 0.12)', border: '#64748b', text: '#475569' }
};

const PENDING_KEYS = new Set([
  'pending',
  'pending_ctsv',
  'pending_icpdp',
  'pending_admin',
  'revision'
]);

// Màu thanh sự kiện ưu tiên theo TÌNH TRẠNG sự kiện (yêu cầu: line màu theo trạng thái).
const STATUS_COLORS = {
  approved: { bg: 'rgba(22, 163, 74, 0.14)', border: '#16a34a', text: '#15803d' },
  live: { bg: 'rgba(37, 99, 235, 0.14)', border: '#2563eb', text: '#1d4ed8' },
  ended: { bg: 'rgba(148, 163, 184, 0.20)', border: '#94a3b8', text: '#64748b' },
  rejected: { bg: 'rgba(239, 68, 68, 0.14)', border: '#dc2626', text: '#b91c1c' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.12)', border: '#ef4444', text: '#b91c1c' },
  hidden: { bg: 'rgba(148, 163, 184, 0.16)', border: '#cbd5e1', text: '#64748b' },
  draft: { bg: 'rgba(148, 163, 184, 0.14)', border: '#cbd5e1', text: '#64748b' }
};

const PENDING_COLOR = { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#b45309' };

// Chú thích màu theo trạng thái để hiển thị ở legend.
export const CALENDAR_STATUS_LEGEND = [
  { id: 'approved', label: 'Mở đăng ký', color: STATUS_COLORS.approved.border },
  { id: 'live', label: 'Đang diễn ra', color: STATUS_COLORS.live.border },
  { id: 'ended', label: 'Đã kết thúc', color: STATUS_COLORS.ended.border },
  { id: 'pending', label: 'Chờ duyệt', color: PENDING_COLOR.border },
  { id: 'rejected', label: 'Từ chối', color: STATUS_COLORS.rejected.border }
];

export const WEEKDAYS_VI = ['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CN'];

export const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const formatMonthLabel = (date) => {
  const label = date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const parseEventDate = (ev) => {
  const fromStart = toDate(ev.startDate);
  if (fromStart) return fromStart;
  if (ev.date && typeof ev.date === 'string') {
    const parts = ev.date.split('/');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
};

const resolveEventColors = (statusKey, isPending, source) => {
  if (isPending) return PENDING_COLOR;
  if (STATUS_COLORS[statusKey]) return STATUS_COLORS[statusKey];
  return SOURCE_COLORS[source] || SOURCE_COLORS.club;
};

export const mapCtsvCalendarEvent = (ev) => {
  const start = parseEventDate(ev);
  const endRaw = toDate(ev.endDate);
  // Kết thúc tối thiểu bằng ngày bắt đầu; nếu endDate < start (dữ liệu lỗi) thì coi là 1 ngày.
  const end = endRaw && start && startOfDay(endRaw) >= startOfDay(start) ? endRaw : start;
  const source = ev.source || 'club';
  const statusKey = ev.statusKey || '';
  const isPending = PENDING_KEYS.has(statusKey);

  return {
    id: ev.id,
    title: ev.title,
    time: ev.time || '',
    location: ev.location || '',
    date: start,
    start,
    end,
    source,
    sourceLabel: source === 'school' ? 'Cấp trường' : source === 'partner' ? 'Đối tác' : 'CLB',
    status: ev.status,
    statusKey,
    isPending,
    colors: resolveEventColors(statusKey, isPending, source)
  };
};

const MAX_LANES = 4;

export const buildMonthCells = (viewDate, events, todayStart) => {
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthStartMs = startOfDay(new Date(viewYear, viewMonth, 1));
  const monthEndMs = startOfDay(new Date(viewYear, viewMonth, daysInMonth));

  // Sự kiện có KHOẢNG thời gian giao với tháng đang xem (không chỉ ngày bắt đầu).
  const eventsInMonth = events
    .filter((e) => e.start)
    .map((e) => {
      const sMs = startOfDay(e.start);
      const enMs = startOfDay(e.end || e.start);
      return { event: e, sMs, enMs };
    })
    .filter(({ sMs, enMs }) => sMs <= monthEndMs && enMs >= monthStartMs);

  const clampDay = (ms) => {
    if (ms < monthStartMs) return 1;
    if (ms > monthEndMs) return daysInMonth;
    return new Date(ms).getDate();
  };

  const ranged = eventsInMonth.map(({ event, sMs, enMs }) => ({
    ...event,
    startDay: clampDay(sMs),
    endDay: clampDay(enMs),
    // Có bị cắt bởi mép tháng không (để bo góc thanh đúng chỗ).
    clippedStart: sMs < monthStartMs,
    clippedEnd: enMs > monthEndMs,
    multiDay: startOfDay(event.end || event.start) > startOfDay(event.start)
  }));

  // Sắp xếp: bắt đầu sớm trước, sự kiện dài hơn ưu tiên lane trên.
  ranged.sort(
    (a, b) =>
      a.startDay - b.startDay ||
      b.endDay - b.startDay - (a.endDay - a.startDay) ||
      String(a.title).localeCompare(String(b.title))
  );

  // Gán lane bằng thuật toán tham lam để cùng một sự kiện nằm trên một hàng ngang
  // xuyên suốt các ngày → thanh line liền mạch.
  const laneEnds = [];
  ranged.forEach((e) => {
    let lane = 0;
    while (lane < laneEnds.length && laneEnds[lane] >= e.startDay) lane += 1;
    laneEnds[lane] = e.endDay;
    e.lane = lane;
  });
  const laneCount = Math.min(laneEnds.length, MAX_LANES);

  const startOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(viewYear, viewMonth, day);
    const cellStart = startOfDay(cellDate);
    const weekdayIdx = (cellDate.getDay() + 6) % 7; // 0 = Thứ 2 ... 6 = CN
    const spanning = ranged.filter((e) => day >= e.startDay && day <= e.endDay);

    const lanes = [];
    let hiddenCount = 0;
    spanning.forEach((e) => {
      if (e.lane >= MAX_LANES) {
        hiddenCount += 1;
        return;
      }
      lanes[e.lane] = {
        event: e,
        lane: e.lane,
        isStart: day === e.startDay && !e.clippedStart,
        isEnd: day === e.endDay && !e.clippedEnd,
        isSegmentStart: day === e.startDay, // đầu đoạn trong tháng
        isWeekStart: weekdayIdx === 0,
        isWeekEnd: weekdayIdx === 6,
        multiDay: e.multiDay
      };
    });

    cells.push({
      day,
      date: cellDate,
      cellStart,
      lanes,
      laneCount,
      hiddenCount,
      // Danh sách sự kiện giao với ngày này (cho sidebar khi chọn ngày).
      events: spanning,
      isToday: cellStart === todayStart,
      isPast: cellStart < todayStart,
      isFuture: cellStart > todayStart
    });
  }

  return { cells, eventsInMonth: ranged };
};
