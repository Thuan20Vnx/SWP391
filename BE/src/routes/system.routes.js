const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { isDbReady } = require('../config/db');
const { getPublicStatus, getPaymentSettings } = require('../services/systemSettings.service');
const { handleSepayWebhook } = require('../services/payment.service');

const router = express.Router();

// Webhook SePay — nhận thông báo giao dịch chuyển khoản (POST từ SePay, không qua JWT)
router.post('/payments/sepay-webhook', asyncHandler(async (req, res) => {
  const settings = await getPaymentSettings();

  // Xác thực: nếu đã cấu hình webhookApiKey thì bắt buộc header "Authorization: Apikey <key>"
  if (settings.webhookApiKey) {
    const header = String(req.headers.authorization || '');
    const provided = header.replace(/^Apikey\s+/i, '').trim();
    if (provided !== settings.webhookApiKey) {
      return res.status(401).json({ success: false, message: 'Unauthorized webhook.' });
    }
  }

  const result = await handleSepayWebhook(req.body || {});
  // SePay chỉ cần HTTP 200 + success=true để không retry
  return res.status(200).json({ success: true, ...result });
}));

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
