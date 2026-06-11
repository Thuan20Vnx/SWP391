import {
  ADMIN_ACTIVITY_LOG_TEMPLATES,
  ADMIN_TRAFFIC_HOURLY_PATTERN,
  ADMIN_TRAFFIC_SPARKLINE,
  ADMIN_MONTHLY_VALUES,
  ADMIN_REVENUE_OVERVIEW_STATIC,
  ADMIN_SYSTEM_SERVICES,
} from './adminDashboardData';
import {
  addMinutes,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminTime,
  formatHourRange,
  formatMonthYear,
  formatMonthYearShort,
  formatRelativeSeconds,
  startOfDay,
} from '../utils/adminLiveTime';

const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export const buildActivityLogs = (now) =>
  ADMIN_ACTIVITY_LOG_TEMPLATES.map((item) => ({
    ...item,
    time: formatAdminDateTime(addMinutes(now, -item.minutesAgo)),
    dateKey: formatAdminDate(addMinutes(now, -item.minutesAgo)),
  }));

const buildTrafficHourlyRows = (now) => {
  const currentHour = now.getHours();
  const slots = ADMIN_TRAFFIC_HOURLY_PATTERN.map((pattern, index) => {
    const hour = (currentHour - (ADMIN_TRAFFIC_HOURLY_PATTERN.length - 1 - index) + 24) % 24;
    return {
      id: String(index + 1),
      hour,
      time: formatHourRange(hour),
      online: pattern.online,
      sessions: pattern.sessions,
      views: pattern.views,
      avg: pattern.avg,
      delta: pattern.delta,
      deltaTone: pattern.deltaTone,
      highlight: false,
    };
  });

  let peakIdx = 0;
  slots.forEach((row, i) => {
    if (row.online > slots[peakIdx].online) peakIdx = i;
  });
  slots[peakIdx] = {
    ...slots[peakIdx],
    time: `${slots[peakIdx].time} (đỉnh)`,
    highlight: true,
  };

  return { rows: slots, peak: slots[peakIdx] };
};

const buildMonthlyPerformance = (now) => {
  const items = ADMIN_MONTHLY_VALUES.map((value, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (ADMIN_MONTHLY_VALUES.length - 1 - index), 1);
    const monthIndex = d.getMonth();
    return {
      label: `T${monthIndex + 1}`,
      value,
      month: MONTH_NAMES[monthIndex],
      monthDate: d,
    };
  });

  const peak = items.reduce((best, item) => (item.value > best.value ? item : best), items[0]);
  const prev = items[items.length - 2];
  const last = items[items.length - 1];
  const growth =
    prev && prev.value > 0
      ? `${((last.value - prev.value) / prev.value) * 100 >= 0 ? '+' : ''}${(((last.value - prev.value) / prev.value) * 100).toFixed(1).replace('.', ',')}%`
      : '+0%';

  const avg = items.reduce((s, i) => s + i.value, 0) / items.length;

  return {
    monthly: items,
    summary: {
      period: '6 tháng gần nhất',
      avg: Math.round(avg * 10) / 10,
      peak: { label: peak.label, value: peak.value, month: peak.month },
      growth,
      growthCaption: `${last.label} so với ${prev?.label || ''}`,
    },
    peakMonthIndex: items.findIndex((i) => i.label === peak.label),
  };
};

export const buildLiveDashboardData = (now = new Date()) => {
  const logs = buildActivityLogs(now);
  const { rows: trafficRows, peak: trafficPeak } = buildTrafficHourlyRows(now);
  const { monthly, summary: chartSummary, peakMonthIndex } = buildMonthlyPerformance(now);
  const monthLabel = formatMonthYear(now);
  const monthShort = formatMonthYearShort(now);
  const todayLabel = formatAdminDate(now);
  const secondsSinceBoot = Math.floor((now.getTime() - startOfDay(now).getTime()) / 1000) % 45 + 8;

  const trafficDetail = {
    title: 'Chi tiết lưu lượng truy cập',
    subtitle: `Theo dõi theo khung giờ · Hôm nay ${todayLabel}`,
    summary: [
      { label: 'Đang trực tuyến', value: '1.250' },
      { label: 'Phiên hôm nay', value: '4.820' },
      {
        label: 'Đỉnh trong ngày',
        value: `${trafficPeak.online.toLocaleString('vi-VN')} (${formatHourRange(trafficPeak.hour).split(' – ')[0]})`,
      },
    ],
    columns: ['Khung giờ', 'Trực tuyến', 'Phiên mới', 'Lượt xem', 'TB / phiên', 'So với hôm qua'],
    rows: trafficRows,
  };

  const revenueDetail = {
    title: 'Chi tiết doanh thu bán vé',
    subtitle: `${monthShort} · Toàn sàn F-Events`,
    summary: ADMIN_REVENUE_OVERVIEW_STATIC.detailSummary,
    columns: ['Sự kiện', 'CLB / Đơn vị', 'Vé bán', 'Doanh thu', 'Kênh', 'Trạng thái'],
    rows: ADMIN_REVENUE_OVERVIEW_STATIC.detailRows,
  };

  const performanceRows = monthly.map((m, index) => {
    const notes = [
      'Khởi động hệ thống',
      'Tăng sau kỳ nghỉ',
      'Bảo trì định kỳ',
      'Mùa sự kiện lớn',
      'Ổn định trung bình',
      'Cao nhất · TechDay',
    ];
    return {
      id: String(index + 1),
      month: `${m.month} (${m.label})`,
      score: `${m.value}%`,
      events: [8, 11, 6, 14, 10, 18][index],
      sessions: ['12.4K', '18.2K', '9.1K', '24.6K', '16.8K', '31.2K'][index],
      cpu: ['41%', '48%', '52%', '55%', '49%', '58%'][index],
      note: notes[index],
      highlight: m.label === chartSummary.peak.label,
    };
  });

  const performanceDetail = {
    title: 'Chi tiết hiệu suất vận hành',
    subtitle: `${chartSummary.period} · Chỉ số tổng hợp (%) · Cập nhật ${formatAdminDate(now)}`,
    summary: [
      { label: 'Trung bình', value: `${String(chartSummary.avg).replace('.', ',')}%` },
      { label: 'Cao nhất', value: `${chartSummary.peak.label} · ${chartSummary.peak.value}%` },
      { label: `Tăng trưởng ${chartSummary.growthCaption}`, value: chartSummary.growth },
    ],
    columns: ['Tháng', 'Hiệu suất', 'Sự kiện active', 'Phiên xử lý', 'CPU trung bình', 'Ghi chú'],
    rows: performanceRows,
  };

  return {
    now,
    activityLogs: logs,
    trafficSparkline: ADMIN_TRAFFIC_SPARKLINE,
    trafficOverview: {
      active: 1250,
      live: {
        pill: 'Live',
        title: 'Trực tuyến',
        hint: `Cập nhật lúc ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`,
      },
      compare: {
        trend: '+8,2%',
        direction: 'up',
        label: 'Biến động',
        reference: 'So với cùng khung giờ hôm qua',
      },
      sparklineCaption: '6 giờ qua',
      peak: {
        value: trafficPeak.online,
        time: (() => {
          const d = new Date(now);
          d.setHours(trafficPeak.hour, 0, 0, 0);
          return formatAdminTime(d);
        })(),
      },
      metrics: [
        { id: 'sessions', label: 'Phiên hôm nay', value: '4,820' },
        { id: 'pageviews', label: 'Lượt xem trang', value: '28.4K' },
        { id: 'avg', label: 'TB / phiên', value: '5m 42s' },
      ],
      channels: [
        { id: 'web', label: 'Web', percent: 62 },
        { id: 'mobile', label: 'Mobile', percent: 38 },
      ],
    },
    revenueOverview: {
      ...ADMIN_REVENUE_OVERVIEW_STATIC.overview,
      goal: {
        ...ADMIN_REVENUE_OVERVIEW_STATIC.overview.goal,
        label: `Mục tiêu ${monthLabel}`,
      },
    },
    systemOverall: {
      status: 'stable',
      label: 'ỔN ĐỊNH',
      uptime: '99.9%',
      uptimeCaption: 'uptime 30 ngày',
      lastCheck: `Kiểm tra lúc ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} · ${formatRelativeSeconds(secondsSinceBoot)}`,
    },
    systemServices: ADMIN_SYSTEM_SERVICES,
    monthlyPerformance: monthly,
    chartSummary,
    peakMonthIndex,
    metricDetailMap: {
      traffic: trafficDetail,
      revenue: revenueDetail,
      performance: performanceDetail,
    },
  };
};
