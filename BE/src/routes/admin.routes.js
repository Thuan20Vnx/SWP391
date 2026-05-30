const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(authorize('admin'));

router.get('/accounts', asyncHandler(adminController.listAccounts));
router.post('/accounts', asyncHandler(adminController.createAccount));
router.get('/accounts/:id', asyncHandler(adminController.getAccount));
router.put('/accounts/:id', asyncHandler(adminController.updateAccount));
router.patch('/accounts/:id/status', asyncHandler(adminController.updateAccountStatus));
router.delete('/accounts/:id', asyncHandler(adminController.deleteAccount));
router.get('/data/overview', asyncHandler(adminController.getDataOverview));

module.exports = router;
