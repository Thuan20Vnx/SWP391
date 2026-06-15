/** Gợi ý tìm kiếm nhanh trên mobile — theo ngữ cảnh trang. */

export const MOBILE_SEARCH_SUGGESTIONS = {
  home: ['Workshop', 'Âm nhạc', 'Công nghệ', 'Kết nối', 'Hackathon'],
  events: ['Workshop', 'Âm nhạc', 'Công nghệ', 'Sắp diễn ra', 'Miễn phí'],
  clubs: ['CNTT', 'Robotics', 'Kinh tế', 'Đa phương tiện', 'F-Code'],
  news: ['Sự kiện', 'Đăng ký', 'Học bổng', 'CTSV', 'Thông báo mới'],
  admin: ['Tài khoản', 'Sự kiện', 'Thông báo', 'Đối tác', 'Báo cáo'],
  partner: ['Sự kiện', 'Hợp đồng', 'Workshop', 'Công nghệ', 'Tài trợ'],
  partnerEvents: ['Workshop', 'Công nghệ', 'Sắp diễn ra', 'Miễn phí', 'Tài trợ'],
  partnerContracts: ['Hợp đồng', 'Đối tác', 'Ký kết', 'Phụ lục', 'Thanh toán'],
  default: ['Sự kiện', 'Câu lạc bộ', 'Workshop', 'Thông báo'],
};

export const resolveMobileSearchSuggestions = (activeNav, pathname = '', isAdminRoute = false) => {
  if (pathname.startsWith('/partner/contracts')) {
    return MOBILE_SEARCH_SUGGESTIONS.partnerContracts;
  }
  if (pathname.startsWith('/partner/events')) {
    return MOBILE_SEARCH_SUGGESTIONS.partnerEvents;
  }
  if (pathname.startsWith('/partner')) {
    return MOBILE_SEARCH_SUGGESTIONS.partner;
  }
  if (isAdminRoute) return MOBILE_SEARCH_SUGGESTIONS.admin;
  if (activeNav === 'clubs' || pathname.startsWith('/clubs')) {
    return MOBILE_SEARCH_SUGGESTIONS.clubs;
  }
  if (activeNav === 'news' || pathname.startsWith('/announcements')) {
    return MOBILE_SEARCH_SUGGESTIONS.news;
  }
  if (activeNav === 'events' || pathname.startsWith('/events')) {
    return MOBILE_SEARCH_SUGGESTIONS.events;
  }
  if (activeNav === 'home' || pathname === '/') {
    return MOBILE_SEARCH_SUGGESTIONS.home;
  }
  return MOBILE_SEARCH_SUGGESTIONS.default;
};
