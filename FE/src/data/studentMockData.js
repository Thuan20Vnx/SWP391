export const getGreeting = (name) => {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  return `${prefix}, ${name || 'bạn'}`;
};
