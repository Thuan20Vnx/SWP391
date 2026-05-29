module.exports = {
  PORT: process.env.PORT || 5000,
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'mock',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  OTP_EXPIRY_MINUTES: 5,
};
