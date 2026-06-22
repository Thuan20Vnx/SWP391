const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const optionalAuth = require('../middleware/optionalAuth');
const { getWeatherWithAdvice } = require('../services/weather.service');

const router = express.Router();

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const result = await getWeatherWithAdvice({ authEmail: req.authEmail });
    res.status(200).json({ success: true, ...result });
  })
);

module.exports = router;
