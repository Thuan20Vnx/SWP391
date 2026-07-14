const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const userController = require('../controllers/user.controller');

const router = express.Router();

/** Public — <img src="/api/user/avatar/:id"> cannot send Bearer token */
router.get('/avatar/:userId', asyncHandler(userController.getAvatar));

router.use(authMiddleware);

router.get('/profile', asyncHandler(userController.getProfile));
router.get('/my-events', authorize('student', 'staff', 'partner', 'guest', 'club_manager'), asyncHandler(userController.getMyEvents));
router.get('/my-clubs', authorize('student', 'staff', 'club_manager'), asyncHandler(userController.getMyClubs));
router.get('/event-reviews', authorize('student', 'staff', 'partner', 'guest'), asyncHandler(userController.getEventReviews));
router.put('/profile/avatar', asyncHandler(userController.updateAvatar));
router.patch('/profile/avatar', asyncHandler(userController.updateAvatar));
router.put('/profile', asyncHandler(userController.updateProfile));
router.put('/change-password', asyncHandler(userController.changePassword));
router.post('/verify-password', asyncHandler(userController.verifyPassword));

module.exports = router;
