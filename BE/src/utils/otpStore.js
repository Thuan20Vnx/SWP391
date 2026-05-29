const { OTP_EXPIRY_MINUTES } = require('../config/env');

const pendingUsers = new Map();
const pendingResets = new Map();
const OTP_TTL_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const isExpired = (entry) => Date.now() > entry.expiresAt;

module.exports = {
  pendingUsers,
  pendingResets,
  OTP_TTL_MS,
  generateOtp,
  isExpired,
};
