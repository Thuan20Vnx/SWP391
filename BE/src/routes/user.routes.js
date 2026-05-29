const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/profile', asyncHandler(userController.getProfile));
router.put('/profile', asyncHandler(userController.updateProfile));
router.put('/change-password', asyncHandler(userController.changePassword));
router.post('/verify-password', asyncHandler(userController.verifyPassword));

module.exports = router;
