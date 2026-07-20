const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authController = require('../controllers/auth.controller');
const { rateLimit } = require('../middleware/rateLimit.middleware');
const { getSecuritySettings } = require('../services/systemSettings.service');

const router = express.Router();

// Hạn mức đăng nhập: admin chỉnh được qua Cài đặt hệ thống (security.apiRateLimit).
// Đặt TRƯỚC controller nên request vượt hạn bị loại trước khi chạm MongoDB/BCrypt.
const loginLimiter = rateLimit({
  name: 'login',
  limit: 120,
  windowMs: 60_000,
  resolveLimit: async () => (await getSecuritySettings()).apiRateLimit,
  message: 'Bạn đăng nhập quá nhiều lần trong thời gian ngắn. Vui lòng thử lại sau ít phút.',
});

// Gửi email (OTP, quên mật khẩu) siết chặt hơn nhiều: mỗi request tốn một email
// thật, nên bị spam vừa tốn quota Brevo vừa dễ khiến domain bị đưa vào danh sách đen.
const emailLimiter = rateLimit({
  name: 'email-otp',
  limit: 3,
  windowMs: 5 * 60_000,
  message: 'Bạn đã yêu cầu gửi email quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.',
});

// Đăng ký tài khoản: chặn bot tạo hàng loạt tài khoản rác.
const signupLimiter = rateLimit({
  name: 'signup',
  limit: 10,
  windowMs: 10 * 60_000,
  message: 'Bạn đã tạo quá nhiều tài khoản từ thiết bị này. Vui lòng thử lại sau.',
});

router.post('/login', loginLimiter, asyncHandler(authController.login));
router.post('/forgot-password', emailLimiter, asyncHandler(authController.forgotPassword));
router.post('/reset-password', loginLimiter, asyncHandler(authController.resetPassword));
router.get('/unlock-account', loginLimiter, asyncHandler(authController.unlockAccount));
router.post('/signup', signupLimiter, asyncHandler(authController.signup));
router.get('/check-username', loginLimiter, asyncHandler(authController.checkUsername));
router.post('/verify-otp', loginLimiter, asyncHandler(authController.verifyOtp));
router.post('/resend-otp', emailLimiter, asyncHandler(authController.resendOtp));
router.post('/google', loginLimiter, asyncHandler(authController.googleLogin));
router.get('/google/callback', authController.googleCallback);
router.get('/google/calendar', authController.googleCalendarConnect);
router.get('/google/calendar/callback', authController.googleCalendarCallback);

module.exports = router;
