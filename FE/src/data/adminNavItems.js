/** Menu sidebar admin — cấu trúc giống CTSV */
export const ADMIN_NAV_ITEMS = [
  { path: '/admin', label: 'Bảng điều khiển', icon: 'dashboard', end: true },
  { path: '/profile', label: 'Hồ sơ', icon: 'profile' },
  { section: 'QUẢN TRỊ' },
  { path: '/admin/accounts', label: 'Kiểm soát tài khoản', icon: 'accounts' },
  { path: '/admin/system', label: 'Kiểm soát hệ thống', icon: 'system' },
  { path: '/admin/data', label: 'Quản lý cơ sở & danh mục', icon: 'data' },
  { path: '/admin/partners', label: 'Đối tác', icon: 'partners' },
  { path: '/admin/analytics', label: 'Đánh giá & Phân tích', icon: 'analytics' },
  { section: 'SỰ KIỆN' },
  { path: '/admin/events', label: 'Duyệt đề xuất sự kiện', icon: 'events' },
  { path: '/admin/event-requests', label: 'Yêu cầu sửa / ẩn / xóa', icon: 'event-requests' },
];
