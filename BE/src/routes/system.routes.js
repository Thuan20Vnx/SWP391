const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getPublicStatus } = require('../services/systemSettings.service');

const router = express.Router();

router.get('/status', asyncHandler(async (req, res) => {
  const status = await getPublicStatus();
  res.json({ success: true, ...status });
}));

module.exports = router;
