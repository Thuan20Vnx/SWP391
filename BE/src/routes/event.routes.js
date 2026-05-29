const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authorize = require('../middleware/authorize');
const eventController = require('../controllers/event.controller');

const router = express.Router();

router.post('/', authorize('student', 'staff'), asyncHandler(eventController.createEvent));
router.get('/pending', authorize('ctsv'), asyncHandler(eventController.getPendingEvents));
router.put('/:id/status', authorize('ctsv'), asyncHandler(eventController.updateEventStatus));
router.get('/', asyncHandler(eventController.getApprovedEvents));

module.exports = router;
