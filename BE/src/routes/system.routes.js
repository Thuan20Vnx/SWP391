const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { isDbReady } = require('../config/db');
const { getPublicStatus } = require('../services/systemSettings.service');

const router = express.Router();

router.get('/status', asyncHandler(async (req, res) => {
  const status = await getPublicStatus();
  res.json({
    success: true,
    ...status,
    dbReady: isDbReady(),
    uptimeSec: Math.floor(process.uptime()),
  });
}));

router.get('/health', asyncHandler(async (req, res) => {
  const dbReady = isDbReady();
  res.status(dbReady ? 200 : 503).json({
    success: dbReady,
    dbReady,
    uptimeSec: Math.floor(process.uptime()),
  });
}));

module.exports = router;
