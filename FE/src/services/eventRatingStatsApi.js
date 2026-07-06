import { API_BASE, getAuthHeaders } from '../utils/api';
import { getUserRole } from '../utils/auth';

const resolveRatingStatsPath = (eventId, role = getUserRole()) => {
  if (role === 'partner') {
    return `${API_BASE}/api/partner/events/${eventId}/rating-stats`;
  }
  if (role === 'ctsv' || role === 'icpdp' || role === 'admin') {
    return `${API_BASE}/api/ctsv/events/${eventId}/rating-stats`;
  }
  return `${API_BASE}/api/events/${eventId}/rating-stats`;
};

export const fetchEventRatingStats = async (eventId) => {
  const primaryUrl = resolveRatingStatsPath(eventId);
  const fallbackUrl =
    primaryUrl.includes('/api/ctsv/')
      ? `${API_BASE}/api/events/${eventId}/rating-stats`
      : null;

  const request = async (url) => {
    const res = await fetch(url, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Không tải được thống kê đánh giá.');
      err.status = res.status;
      throw err;
    }
    return data.stats;
  };

  try {
    return await request(primaryUrl);
  } catch (error) {
    if (fallbackUrl && error.status === 404) {
      return request(fallbackUrl);
    }
    throw error;
  }
};
