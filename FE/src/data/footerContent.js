/** Liên kết & thông tin dùng chung cho SiteFooter (student / guest / trang công khai). */

export const FOOTER_SOCIAL_LINKS = [
  {
    id: 'facebook',
    label: 'Facebook FPT University',
    href: 'https://www.facebook.com/FPTUniversity',
  },
  {
    id: 'website',
    label: 'Website FPT Education',
    href: 'https://fpt.edu.vn',
  },
  {
    id: 'instagram',
    label: 'Instagram FPT University',
    href: 'https://www.instagram.com/fptuniversity/',
  },
];

export const FOOTER_CONTACT = {
  ctsvEmail: 'ctsv@fpt.edu.vn',
  supportEmail: 'fevents-support@fpt.edu.vn',
  hotline: '0236 3 757 757',
  address: 'FPT University Đà Nẵng, Khu đô thị FPT, Ngũ Hành Sơn',
};

export const FOOTER_EXPLORE_LINKS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/events', label: 'Khám phá sự kiện' },
  { to: '/clubs', label: 'Câu lạc bộ' },
  { to: '/announcements', label: 'Tin tức & thông báo' },
];

export const FOOTER_SUPPORT_LINKS = [
  { to: '/support', label: 'Trung tâm trợ giúp' },
  { to: '/guide', label: 'Hướng dẫn đăng ký' },
  { to: '/contact', label: 'Liên hệ ban tổ chức' },
  { to: '/contact#report', label: 'Báo cáo sự cố' },
];

export const FOOTER_POLICY_LINKS = [
  { to: '/privacy', label: 'Chính sách bảo mật' },
  { to: '/terms', label: 'Điều khoản sử dụng' },
  { to: '/cookies', label: 'Chính sách Cookie' },
];

export const FOOTER_GUEST_ACCOUNT_LINKS = [
  { to: '/login', label: 'Đăng nhập' },
  { to: '/signup', label: 'Đăng ký tài khoản' },
  { to: '/guide', label: 'Hướng dẫn tham gia sự kiện' },
];

export const FOOTER_STUDENT_ACCOUNT_LINKS = [
  { to: '/dashboard', label: 'Tổng quan' },
  { to: '/profile', label: 'Hồ sơ cá nhân' },
  { to: '/my-events', label: 'Sự kiện của tôi' },
  { to: '/settings', label: 'Cài đặt tài khoản' },
];

export const FOOTER_CLUB_ACCOUNT_LINKS = [
  { to: '/quan-ly-clb/su-kien', label: 'Sự kiện CLB quản lý' },
  { to: '/quan-ly-clb/announcements', label: 'Đăng thông báo CLB' },
  { to: '/quan-ly-clb', label: 'Cổng quản lý CLB' },
  { to: '/profile', label: 'Hồ sơ cá nhân' },
];
