const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const optionalAuth = require('../middleware/optionalAuth');
const optionalAuthorize = require('../middleware/optionalAuthorize');
const clubController = require('../controllers/club.controller');

const router = express.Router();

router.get('/', optionalAuth, optionalAuthorize, asyncHandler(clubController.getClubs));
router.get('/:slug', optionalAuth, optionalAuthorize, asyncHandler(clubController.getClubBySlug));

router.post(
  '/:id/join',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(clubController.joinClub)
);
router.delete(
  '/:id/join',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(clubController.cancelJoinClub)
);
router.patch(
  '/:id/members/:userId/approve',
  authMiddleware,
  authorize('staff'),
  asyncHandler(clubController.approveMembership)
);
router.post(
  '/:id/follow',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(clubController.followClub)
);
router.delete(
  '/:id/follow',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(clubController.unfollowClub)
);

module.exports = router;
