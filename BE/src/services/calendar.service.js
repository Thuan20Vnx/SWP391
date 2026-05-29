const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = require('../config/env');

const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TIMEZONE = 'Asia/Ho_Chi_Minh';

const getAccessToken = async (refreshToken) => {
  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();
  return token;
};

const buildCalendarEventPayload = (event) => ({
  summary: event.title,
  location: event.location || '',
  description: [
    event.description || '',
    '',
    '— Đăng ký qua FPT Event Platform',
    event.category ? `Chủ đề: ${event.category}` : '',
  ].filter(Boolean).join('\n'),
  start: {
    dateTime: new Date(event.startDate).toISOString(),
    timeZone: TIMEZONE,
  },
  end: {
    dateTime: new Date(event.endDate).toISOString(),
    timeZone: TIMEZONE,
  },
});

const syncEventToGoogleCalendar = async (userId, event) => {
  if (!event || GOOGLE_CLIENT_ID === 'mock') return null;

  try {
    const user = await User.findById(userId).select('+googleCalendarRefreshToken');
    if (!user?.googleCalendarRefreshToken) return null;

    const accessToken = await getAccessToken(user.googleCalendarRefreshToken);
    if (!accessToken) return null;

    const response = await fetch(CALENDAR_EVENTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildCalendarEventPayload(event)),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Google Calendar] Tạo sự kiện thất bại:', errText);
      return null;
    }

    const data = await response.json();
    return data.id || null;
  } catch (error) {
    console.error('[Google Calendar] Lỗi đồng bộ:', error.message);
    return null;
  }
};

const removeEventFromGoogleCalendar = async (userId, googleCalendarEventId) => {
  if (!googleCalendarEventId || GOOGLE_CLIENT_ID === 'mock') return;

  try {
    const user = await User.findById(userId).select('+googleCalendarRefreshToken');
    if (!user?.googleCalendarRefreshToken) return;

    const accessToken = await getAccessToken(user.googleCalendarRefreshToken);
    if (!accessToken) return;

    const response = await fetch(
      `${CALENDAR_EVENTS_URL}/${encodeURIComponent(googleCalendarEventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errText = await response.text();
      console.error('[Google Calendar] Xóa sự kiện thất bại:', errText);
    }
  } catch (error) {
    console.error('[Google Calendar] Lỗi xóa sự kiện:', error.message);
  }
};

module.exports = {
  syncEventToGoogleCalendar,
  removeEventFromGoogleCalendar,
};
