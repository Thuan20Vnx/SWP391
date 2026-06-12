export const getTimeGreeting = (fullname) => {
  // Luôn lấy giờ theo múi giờ Việt Nam (UTC+7), tránh lỗi trên môi trường có timezone khác
  const hourVN = parseInt(
    new Intl.DateTimeFormat('vi-VN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()),
    10
  );
  const part = hourVN < 12 ? 'sáng' : hourVN < 18 ? 'chiều' : 'tối';
  const name = fullname?.trim();
  const short = name ? name.split(/\s+/).slice(-1)[0] : '';
  return short ? `Chào buổi ${part}, ${short}!` : `Chào buổi ${part}!`;
};

export const formatPortalToday = () => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString('vi-VN');
  }
};
