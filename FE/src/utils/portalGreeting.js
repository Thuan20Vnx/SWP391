export const getTimeGreeting = (fullname) => {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'sáng' : hour < 18 ? 'chiều' : 'tối';
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
