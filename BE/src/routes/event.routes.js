const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const authorizeEventParticipant = require('../middleware/authorizeEventParticipant');
const optionalAuth = require('../middleware/optionalAuth');
const optionalAuthorize = require('../middleware/optionalAuthorize');
const eventController = require('../controllers/event.controller');
const eventChangeRequestController = require('../controllers/eventChangeRequest.controller');
const registrationController = require('../controllers/registration.controller');
const reviewController = require('../controllers/review.controller');
const qrScannerController = require('../controllers/qrScanner.controller');

const router = express.Router();

router.post('/', authMiddleware, authorize('student', 'staff', 'club_manager'), asyncHandler(eventController.createEvent));
router.get('/my', authMiddleware, authorize('club_manager', 'student', 'staff'), asyncHandler(eventController.getMyEvents));
router.get('/pending', authorize('ctsv', 'admin'), asyncHandler(eventController.getPendingEvents));
router.put('/:id/status', authorize('ctsv', 'admin'), asyncHandler(eventController.updateEventStatus));
router.delete('/:id', authMiddleware, authorize('club_manager', 'student', 'staff'), asyncHandler(eventController.deleteMyEvent));

router.post(
  '/:id/change-requests',
  authMiddleware,
  authorize('student', 'staff', 'club_manager'),
  asyncHandler(eventChangeRequestController.create)
);

router.post(
  '/:id/register',
  authMiddleware,
  authorizeEventParticipant,
  asyncHandler(registrationController.registerForEvent)
);
router.delete(
  '/:id/register',
  authMiddleware,
  authorizeEventParticipant,
  asyncHandler(registrationController.cancelRegistration)
);
router.post(
  '/:id/review',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(reviewController.submitReview)
);

router.get(
  '/scanner/my-events',
  authMiddleware,
  authorize('student', 'staff', 'club_manager', 'ctsv', 'icpdp', 'admin'),
  asyncHandler(qrScannerController.myScannerEvents)
);
router.get(
  '/:id/scanner-grants',
  authMiddleware,
  authorize('club_manager', 'ctsv', 'icpdp', 'admin'),
  asyncHandler(qrScannerController.listGrants)
);
router.post(
  '/:id/scanner-grants',
  authMiddleware,
  authorize('club_manager', 'ctsv', 'icpdp', 'admin'),
  asyncHandler(qrScannerController.createGrant)
);
router.delete(
  '/:id/scanner-grants/:grantId',
  authMiddleware,
  authorize('club_manager', 'ctsv', 'icpdp', 'admin'),
  asyncHandler(qrScannerController.revokeGrant)
);
router.post(
  '/:id/scan',
  authMiddleware,
  authorize('student', 'staff', 'club_manager', 'ctsv', 'icpdp', 'admin'),
  asyncHandler(qrScannerController.scanRegistration)
);

router.get('/:id', optionalAuth, optionalAuthorize, asyncHandler(eventController.getEventById));
router.get('/', optionalAuth, optionalAuthorize, asyncHandler(eventController.getApprovedEvents));

module.exports = router;
