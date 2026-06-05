/** Menu sidebar khi ICPDP vào /admin/system */
export const ICPDP_ADMIN_NAV_ITEMS = [
  { path: '/icpdp', label: 'Về cổng IC-PDP', icon: 'dashboard' },
  { section: 'QUẢN LÝ CLB' },
  { path: '/icpdp/club-registrations', label: 'Duyệt thành lập CLB', icon: 'accounts' },
  { path: '/icpdp/proposals', label: 'Duyệt đề xuất sự kiện', icon: 'events' },
  { section: 'HỆ THỐNG' },
  { path: '/admin/system', label: 'Bảo trì hệ thống', icon: 'system' },
];

/** Menu sidebar admin — cấu trúc giống CTSV */
export const ADMIN_NAV_ITEMS = [
  { path: '/admin', label: 'Bảng điều khiển', icon: 'dashboard', end: true },
  { path: '/admin/profile', label: 'Hồ sơ', icon: 'profile' },
  { path: '/admin/calendar', label: 'Lịch sự kiện', icon: 'calendar' },
  { section: 'QUẢN TRỊ' },
  { path: '/admin/accounts', label: 'Kiểm soát tài khoản', icon: 'accounts' },
  { path: '/admin/system', label: 'Kiểm soát hệ thống', icon: 'system' },
  { path: '/admin/partners', label: 'Đối tác', icon: 'partners' },
  { path: '/admin/analytics', label: 'Đánh giá & Phân tích', icon: 'analytics' },
  { section: 'SỰ KIỆN' },
  { path: '/admin/events', label: 'Duyệt đề xuất sự kiện', icon: 'events' },
  { path: '/admin/event-requests', label: 'Yêu cầu sửa / ẩn / xóa', icon: 'event-requests' },
];
