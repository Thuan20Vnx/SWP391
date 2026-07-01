export const toStlBadgeTone = (tone) => {
  const allowed = ['amber', 'blue', 'green', 'orange', 'red'];
  return allowed.includes(tone) ? tone : 'amber';
};

export const formatPortalDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};
