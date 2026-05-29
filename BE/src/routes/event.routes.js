const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const optionalAuth = require('../middleware/optionalAuth');
const optionalAuthorize = require('../middleware/optionalAuthorize');
const eventController = require('../controllers/event.controller');
const registrationController = require('../controllers/registration.controller');

const router = express.Router();

router.post('/', authorize('student', 'staff'), asyncHandler(eventController.createEvent));
router.get('/pending', authorize('ctsv'), asyncHandler(eventController.getPendingEvents));
router.put('/:id/status', authorize('ctsv'), asyncHandler(eventController.updateEventStatus));

router.post(
  '/:id/register',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(registrationController.registerForEvent)
);
router.delete(
  '/:id/register',
  authMiddleware,
  authorize('student', 'staff'),
  asyncHandler(registrationController.cancelRegistration)
);

router.get('/', optionalAuth, optionalAuthorize, asyncHandler(eventController.getApprovedEvents));

module.exports = router;
