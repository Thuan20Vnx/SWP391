const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const optionalAuth = require('../middleware/optionalAuth');
const optionalAuthorize = require('../middleware/optionalAuthorize');
const clubController = require('../controllers/club.controller');

const router = express.Router();

router.get('/', optionalAuth, optionalAuthorize, asyncHandler(clubController.getClubs));

router.post(
  '/registrations',
  authMiddleware,
  authorize('student', 'staff', 'club_manager'),
  asyncHandler(clubController.submitClubRegistration)
);

router.get(
  '/manage/clubs',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(clubController.getManagedClubs)
);
router.get(
  '/manage/profile',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(clubController.getManagedClubProfile)
);
router.patch(
  '/manage/profile',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(clubController.updateManagedClubProfile)
);
router.post(
  '/manage/transfer-chairman',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(clubController.transferClubChairman)
);

router.get(
  '/manage/semester-timelines',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(clubController.listSemesterTimelines)
);
router.get(
  '/manage/semester-timelines/:id',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(clubController.getSemesterTimeline)
);
router.post(
  '/manage/semester-timelines',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(clubController.createSemesterTimeline)
);
router.put(
  '/manage/semester-timelines/:id',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(clubController.updateSemesterTimeline)
);
router.post(
  '/manage/semester-timelines/:id/submit',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(clubController.submitSemesterTimeline)
);

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
  authorize('student', 'staff', 'club_manager'),
  asyncHandler(clubController.followClub)
);
router.delete(
  '/:id/follow',
  authMiddleware,
  authorize('student', 'staff', 'club_manager'),
  asyncHandler(clubController.unfollowClub)
);

module.exports = router;
