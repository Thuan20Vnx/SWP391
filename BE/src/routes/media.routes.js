const express = require('express');
const optionalAuth = require('../middleware/optionalAuth');
const asyncHandler = require('../utils/asyncHandler');
const mediaService = require('../services/media.service');

const router = express.Router();

router.get(
  '/partner-requests/:id/cover',
  optionalAuth,
  asyncHandler(async (req, res) => {
    await mediaService.sendPartnerRequestCover(req.params.id, res, { user: req.user || null });
  })
);

router.get(
  '/partner-requests/:id/attachments/:index',
  optionalAuth,
  asyncHandler(async (req, res) => {
    await mediaService.sendPartnerRequestAttachment(req.params.id, req.params.index, res, {
      user: req.user || null,
    });
  })
);

router.get(
  '/partner-requests/:id/speakers/:index/avatar',
  optionalAuth,
  asyncHandler(async (req, res) => {
    await mediaService.sendPartnerRequestSpeakerAvatar(req.params.id, req.params.index, res, {
      user: req.user || null,
    });
  })
);

router.get(
  '/partners/:partnerId/logo',
  optionalAuth,
  asyncHandler(async (req, res) => {
    await mediaService.sendPartnerLogo(req.params.partnerId, res, { user: req.user || null });
  })
);

module.exports = router;
