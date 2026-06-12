const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', asyncHandler(authController.login));
router.post('/forgot-password', asyncHandler(authController.forgotPassword));
router.post('/reset-password', asyncHandler(authController.resetPassword));
router.get('/unlock-account', asyncHandler(authController.unlockAccount));
router.post('/signup', asyncHandler(authController.signup));
router.post('/verify-otp', asyncHandler(authController.verifyOtp));
router.post('/resend-otp', asyncHandler(authController.resendOtp));
router.post('/google', asyncHandler(authController.googleLogin));
router.get('/google/callback', authController.googleCallback);
router.get('/google/calendar', authController.googleCalendarConnect);
router.get('/google/calendar/callback', authController.googleCalendarCallback);

module.exports = router;
