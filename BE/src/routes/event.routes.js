const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const optionalAuth = require('../middleware/optionalAuth');
const optionalAuthorize = require('../middleware/optionalAuthorize');
const eventController = require('../controllers/event.controller');
const registrationController = require('../controllers/registration.controller');
const reviewController = require('../controllers/review.controller');
const { EVENT_PARTICIPANT_ROLES } = require('../constants/eventPricing');

const router = express.Router();

router.post('/', authMiddleware, authorize('student', 'staff', 'club_manager'), asyncHandler(eventController.createEvent));
router.get('/my', authMiddleware, authorize('club_manager', 'student', 'staff'), asyncHandler(eventController.getMyEvents));
router.get('/pending', authorize('ctsv', 'admin'), asyncHandler(eventController.getPendingEvents));
router.put('/:id/status', authorize('ctsv', 'admin'), asyncHandler(eventController.updateEventStatus));
router.delete('/:id', authMiddleware, authorize('club_manager', 'student', 'staff'), asyncHandler(eventController.deleteMyEvent));

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
