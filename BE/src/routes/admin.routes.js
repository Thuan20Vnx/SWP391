const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const adminController = require('../controllers/admin.controller');
const eventChangeRequestController = require('../controllers/eventChangeRequest.controller');

const router = express.Router();

router.use(authMiddleware);

const adminOnly = authorize('admin');
const adminOrCtsv = authorize('admin', 'ctsv');

router.get('/accounts', adminOnly, asyncHandler(adminController.listAccounts));
router.post('/accounts', adminOnly, asyncHandler(adminController.createAccount));
router.get('/accounts/:id', adminOnly, asyncHandler(adminController.getAccount));
router.put('/accounts/:id', adminOnly, asyncHandler(adminController.updateAccount));
router.patch('/accounts/:id/status', adminOnly, asyncHandler(adminController.updateAccountStatus));
router.delete('/accounts/:id', adminOnly, asyncHandler(adminController.deleteAccount));
router.get('/data/overview', adminOnly, asyncHandler(adminController.getDataOverview));

router.get('/event-requests', adminOrCtsv, asyncHandler(eventChangeRequestController.list));
router.get('/event-requests/:id', adminOrCtsv, asyncHandler(eventChangeRequestController.getById));
router.patch('/event-requests/:id/approve', adminOrCtsv, asyncHandler(eventChangeRequestController.approve));
router.patch('/event-requests/:id/reject', adminOrCtsv, asyncHandler(eventChangeRequestController.reject));

module.exports = router;
