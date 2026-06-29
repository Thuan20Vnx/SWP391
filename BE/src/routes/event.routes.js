const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const authorizeEventParticipant = require('../middleware/authorizeEventParticipant');
const optionalAuth = require('../middleware/optionalAuth');
const optionalAuthorize = require('../middleware/optionalAuthorize');
const eventController = require('../controllers/event.controller');
const eventChangeRequestController = require('../controllers/eventChangeRequest.controller');
const { requestClubModeration } = require('../services/eventModeration.service');
const { formatEvent } = require('../utils/eventFormat');
const AppError = require('../utils/AppError');
const registrationController = require('../controllers/registration.controller');
const reviewController = require('../controllers/review.controller');
const qrScannerController = require('../controllers/qrScanner.controller');
const { createAndBroadcast } = require('../services/notification.service');

const router = express.Router();

router.post('/', authMiddleware, authorize('student', 'staff', 'club_manager'), asyncHandler(eventController.createEvent));
router.get('/my', authMiddleware, authorize('club_manager', 'student', 'staff'), asyncHandler(eventController.getMyEvents));
router.get('/pending', authorize('ctsv', 'admin'), asyncHandler(eventController.getPendingEvents));
router.put('/:id/status', authorize('ctsv', 'admin'), asyncHandler(eventController.updateEventStatus));
router.delete('/:id', authMiddleware, authorize('club_manager', 'student', 'staff'), asyncHandler(eventController.deleteMyEvent));
router.put('/:id', authMiddleware, authorize('club_manager', 'student', 'staff'), asyncHandler(eventController.updateMyEvent));

router.post(
  '/:id/change-requests',
  authMiddleware,
  authorize('student', 'staff', 'club_manager'),
  asyncHandler(eventChangeRequestController.create)
);

// PATCH /api/events/:id/moderation — CLB gửi yêu cầu hoãn/hủy (chờ IC-PDP → Admin)
router.patch(
  '/:id/moderation',
  authMiddleware,
  authorize('club_manager'),
  asyncHandler(async (req, res) => {
    try {
      const { action, reasonCategory, content } = req.body || {};
      const result = await requestClubModeration(
        req.params.id,
        { action, reasonCategory, content },
        req.authEmail,
        req.user?._id
      );
      createAndBroadcast({
        recipientRoles: ['icpdp'],
        title: 'CLB gửi yêu cầu điều chỉnh sự kiện',
        body: `CLB vừa gửi yêu cầu ${action || 'điều chỉnh'} cho sự kiện.`,
        type: 'event_change_submit',
        refId: String(req.params.id),
        refType: 'Event'
      }).catch(() => {});
      res.json({
        success: true,
        event: formatEvent(result.event),
        message: result.message
      });
    } catch (error) {
      if (error instanceof AppError || error.statusCode) {
        res.status(error.statusCode || 400).json({ success: false, message: error.message });
        return;
      }
      throw error;
    }
  })
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

router.post(
  '/attendance-code/scan',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(qrScannerController.selfScanByCode)
);

router.get(
  '/:id/station-qr',
  authMiddleware,
  authorize('club_manager', 'ctsv', 'icpdp', 'admin'),
  asyncHandler(qrScannerController.getStationQr)
);
router.post(
  '/:id/station-qr',
  authMiddleware,
  authorize('club_manager', 'ctsv', 'icpdp', 'admin'),
  asyncHandler(qrScannerController.generateStationQr)
);
router.post(
  '/:id/self-scan',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(qrScannerController.selfScan)
);

router.get('/featured', optionalAuth, optionalAuthorize, asyncHandler(eventController.getFeaturedEvents));
router.get('/', optionalAuth, optionalAuthorize, asyncHandler(eventController.getApprovedEvents));
router.get(
  '/:id/plan',
  authMiddleware,
  authorize('student', 'staff', 'club_manager', 'ctsv', 'icpdp', 'admin'),
  asyncHandler(eventController.getEventPlan)
);
router.get('/:id/speakers/:index/avatar', optionalAuth, asyncHandler(eventController.getSpeakerAvatar));
router.get('/:id/cover', optionalAuth, asyncHandler(eventController.getEventCover));
router.get('/:id', optionalAuth, optionalAuthorize, asyncHandler(eventController.getEventById));

module.exports = router;
