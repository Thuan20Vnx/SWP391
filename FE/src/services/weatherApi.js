import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';

export const fetchWeather = async () => {
  const res = await fetch(`${API_BASE}/api/weather`, {
    headers: getAuthHeaders(),
  });
  const { ok, data } = await parseApiResponse(res);
  if (!ok || !data.success) {
    throw new Error(data.message || 'Không tải được dữ liệu thời tiết.');
  }
  return { weather: data.weather, advice: data.advice, hasUpcomingEvent: data.hasUpcomingEvent };
};
