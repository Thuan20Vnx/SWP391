const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const optionalAuth = require('../middleware/optionalAuth');
const optionalAuthorize = require('../middleware/optionalAuthorize');
const eventController = require('../controllers/event.controller');
const eventChangeRequestController = require('../controllers/eventChangeRequest.controller');
const registrationController = require('../controllers/registration.controller');
const reviewController = require('../controllers/review.controller');
const { EVENT_PARTICIPANT_ROLES } = require('../constants/eventPricing');

const router = express.Router();

router.post('/', authorize('student', 'staff'), asyncHandler(eventController.createEvent));
router.get('/pending', authorize('ctsv', 'admin'), asyncHandler(eventController.getPendingEvents));
router.put('/:id/status', authorize('ctsv', 'admin'), asyncHandler(eventController.updateEventStatus));

router.post(
  '/:id/change-requests',
  authMiddleware,
  authorize('student', 'staff', 'club_manager'),
  asyncHandler(eventChangeRequestController.create)
);

router.post(
  '/:id/register',
  authMiddleware,
  authorize(...EVENT_PARTICIPANT_ROLES),
  asyncHandler(registrationController.registerForEvent)
);
router.delete(
  '/:id/register',
  authMiddleware,
  authorize(...EVENT_PARTICIPANT_ROLES),
  asyncHandler(registrationController.cancelRegistration)
);
router.post(
  '/:id/review',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(reviewController.submitReview)
);

router.get('/:id', optionalAuth, optionalAuthorize, asyncHandler(eventController.getEventById));
router.get('/', optionalAuth, optionalAuthorize, asyncHandler(eventController.getApprovedEvents));

module.exports = router;
