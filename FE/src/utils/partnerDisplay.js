export const PARTNER_STATUS_LABEL = {
  pending: 'Chờ duyệt',
  pending_admin: 'Chờ Admin duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  info_requested: 'Cần bổ sung'
};

/** Nhãn trên màn chi tiết — khớp Figma */
export const PARTNER_STATUS_LABEL_DETAIL = {
  pending: 'Chờ duyệt đề xuất',
  pending_admin: 'Chờ Admin duyệt',
  approved: 'Đã duyệt đề xuất',
  rejected: 'Từ chối đề xuất',
  info_requested: 'Cần bổ sung hồ sơ'
};

export const PARTNER_STATUS_TONE = {
  pending: 'amber',
  pending_admin: 'blue',
  approved: 'green',
  rejected: 'red',
  info_requested: 'slate'
};

export const partnerInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const isPartnerImageSrc = (src) =>
  typeof src === 'string' &&
  (src.startsWith('data:image/') || /^https?:\/\//i.test(src.trim()));

/** Logo công ty hoặc avatar đại diện (từ API) */
export const resolvePartnerAvatarSrc = (partner) => {
  if (!partner) return '';
  const candidates = [
    partner.avatar,
    partner.logo,
    partner.representativeAvatar,
    partner.picture,
  ];
  return candidates.find((c) => isPartnerImageSrc(c)) || '';
};

export const formatPartnerDate = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(value));
  } catch {
    return '—';
  }
};

export const formatVnd = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${n.toLocaleString('vi-VN')} đ`;
};
