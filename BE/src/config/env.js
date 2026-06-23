module.exports = {
  PORT: process.env.PORT || 5000,
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  BACKEND_PUBLIC_URL: (
    process.env.BACKEND_PUBLIC_URL
    || process.env.RENDER_EXTERNAL_URL
    || `http://localhost:${process.env.PORT || 5000}`
  ).replace(/\/$/, ''),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'mock',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  GOOGLE_CALENDAR_CALLBACK_URL: process.env.GOOGLE_CALENDAR_CALLBACK_URL || 'http://localhost:5000/api/auth/google/calendar/callback',
  OTP_EXPIRY_MINUTES: 5,
  MOCK_GOOGLE_EMAIL: process.env.MOCK_GOOGLE_EMAIL || 'kxnhan1507@gmail.com',
  MOCK_GOOGLE_NAME: process.env.MOCK_GOOGLE_NAME || 'Nhân Khưu Xuân',
};
