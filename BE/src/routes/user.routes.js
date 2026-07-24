const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const userController = require('../controllers/user.controller');
const { rateLimit } = require('../middleware/rateLimit.middleware');

const router = express.Router();

/** 3 yêu cầu / 15 phút — mỗi yêu cầu đổi định danh đều gửi email OTP thật. */
const identityLimiter = rateLimit({
  name: 'identity-change',
  limit: 3,
  windowMs: 15 * 60_000,
  message: 'Bạn đã yêu cầu đổi email/tên đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút.',
});

/** Public — <img src="/api/user/avatar/:id"> cannot send Bearer token */
router.get('/avatar/:userId', asyncHandler(userController.getAvatar));

router.use(authMiddleware);

router.get('/profile', asyncHandler(userController.getProfile));
router.get('/my-events', authorize('student', 'staff', 'partner', 'guest', 'club_manager'), asyncHandler(userController.getMyEvents));
// Partner & guest cũng theo dõi được CLB nên phải xem được danh sách CLB yêu thích.
router.get('/my-clubs', authorize('student', 'staff', 'club_manager', 'partner', 'guest'), asyncHandler(userController.getMyClubs));
router.get('/event-reviews', authorize('student', 'staff', 'partner', 'guest'), asyncHandler(userController.getEventReviews));
router.put('/profile/avatar', asyncHandler(userController.updateAvatar));
router.patch('/profile/avatar', asyncHandler(userController.updateAvatar));
router.put('/profile', asyncHandler(userController.updateProfile));
router.put('/change-password', asyncHandler(userController.changePassword));
router.post('/verify-password', asyncHandler(userController.verifyPassword));

// Đổi định danh — mỗi lần yêu cầu đều gửi email thật nên siết hạn mức để không
// bị lạm dụng làm công cụ spam hòm thư người khác.
router.post('/email-change/request', identityLimiter, asyncHandler(userController.requestEmailChange));
router.post('/email-change/confirm', asyncHandler(userController.confirmEmailChange));
router.post('/username-change/request', identityLimiter, asyncHandler(userController.requestUsernameChange));
router.post('/username-change/confirm', asyncHandler(userController.confirmUsernameChange));
// Tạo mật khẩu đầu tiên cho tài khoản Google — cùng giới hạn tần suất với đổi định
// danh, vì đây cũng là thao tác cấp thêm đường đăng nhập vào tài khoản.
router.post('/password-setup/request', identityLimiter, asyncHandler(userController.requestPasswordSetup));
router.post('/password-setup/confirm', asyncHandler(userController.confirmPasswordSetup));

module.exports = router;
