import { isPendingApproval } from './eventStatus';

/**
 * CTSV chỉ quản lý sự kiện cấp trường (source: school).
 * Sự kiện CLB / đối tác / catalog cũ — chỉ xem.
 */
export const getCtsvEventAccess = (ev) => {
  const source = ev?.source || 'club';
  const pending = isPendingApproval(ev);

  if (source === 'school') {
    if (pending) {
      return { canManage: true, label: 'Phê duyệt', buttonClass: 'btn-card-manage' };
    }
    return { canManage: true, label: 'Quản lý', buttonClass: 'btn-card-manage' };
  }

  if (pending) {
    return { canManage: false, label: 'Xem chi tiết', buttonClass: 'btn-card-view' };
  }

  return { canManage: false, label: 'Xem chi tiết', buttonClass: 'btn-card-view' };
};

export const isCtsvManagedEvent = (ev) => getCtsvEventAccess(ev).canManage;

/** Sự kiện đang diễn ra hoặc đang mở đăng ký trong khung thời gian */
export const isEventLiveOrOngoing = (ev) => {
  const key = ev?.statusKey || '';
  if (key === 'live') return true;
  if (key === 'approved') {
    const now = Date.now();
    const start = ev.startDate ? new Date(ev.startDate).getTime() : null;
    const end = ev.endDate ? new Date(ev.endDate).getTime() : null;
    if (start != null && end != null && now >= start && now <= end) return true;
    if (start != null && end == null && now >= start) return true;
  }
  const label = (ev?.status || '').toUpperCase();
  return label.includes('ĐANG DIỄN RA') || label.includes('MỞ ĐĂNG KÝ');
};
