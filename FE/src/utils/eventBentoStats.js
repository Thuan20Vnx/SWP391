const clampPct = (value) => Math.min(100, Math.max(0, Math.round(value)));

export const getRegistrationProgress = (registered, capacity) => {
  const cap = Number(capacity) || 0;
  const reg = Number(registered) || 0;
  if (!cap) return { pct: 0, tone: 'low', label: 'Chưa có chỉ tiêu' };
  const pct = clampPct((reg / cap) * 100);
  if (reg === 0) return { pct: 0, tone: 'low', label: 'Chưa có đăng ký (0%)' };
  if (pct >= 100) return { pct: 100, tone: 'high', label: 'Đã đạt chỉ tiêu (100%)' };
  return { pct, tone: getProgressTone(pct), label: `Đạt ${pct}% mục tiêu` };
};

export const getCheckinProgress = (checkin, registered) => {
  const reg = Number(registered) || 0;
  const chk = Number(checkin) || 0;
  if (reg === 0) {
    return { pct: 0, tone: 'low', label: 'Chưa có sinh viên đăng ký' };
  }
  const pct = clampPct((chk / reg) * 100);
  return {
    pct,
    tone: getProgressTone(pct),
    label: `${chk}/${reg} sinh viên đã check-in (${pct}%)`,
  };
};

export const getProgressTone = (pct) => {
  if (pct >= 67) return 'high';
  if (pct >= 34) return 'mid';
  return 'low';
};

export const formatEventRating = (event) => {
  const raw = event?.averageRating ?? event?.rating ?? 0;
  const value = Number(raw) || 0;
  const count = Number(event?.reviewCount ?? event?.ratingCount ?? 0) || 0;
  return {
    value: Math.round(value * 10) / 10,
    count,
    label: value > 0 ? value.toFixed(1) : '0.0',
  };
};

export const getReachWeekDelta = (event) => {
  const reach = Number(event?.reach ?? 0) || 0;
  const prev = Number(event?.reachLastWeek ?? 0) || 0;
  if (event?.reachWeekDelta != null && Number.isFinite(Number(event.reachWeekDelta))) {
    return Number(event.reachWeekDelta);
  }
  if (prev === 0) return reach === 0 ? 0 : 100;
  return clampPct(((reach - prev) / prev) * 100);
};

export const formatRelativeUpdate = (dateValue) => {
  if (!dateValue) return 'Chưa cập nhật';
  const diff = Date.now() - new Date(dateValue).getTime();
  if (diff < 0) return 'Vừa cập nhật';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa cập nhật';
  if (mins < 60) return `Cập nhật: ${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Cập nhật: ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `Cập nhật: ${days} ngày trước`;
};
