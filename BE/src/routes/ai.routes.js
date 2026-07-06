const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const { extractEventFromText } = require('../services/aiEventExtract.service');
const { extractTimelineFromText } = require('../services/aiTimelineExtract.service');

const router = express.Router();

// Trích xuất thông tin sự kiện từ text thô của file (fallback khi parser template thất bại).
// Cho phép mọi người dùng đã đăng nhập (CTSV, ICPDP, CLB, đối tác đều tạo sự kiện).
router.post(
  '/extract-event',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung văn bản.' });
    }
    const { patch } = await extractEventFromText(text);
    res.status(200).json({ success: true, patch });
  })
);

// Trích xuất kế hoạch timeline kỳ học (tóm tắt, mục tiêu, kỳ/năm, danh sách mốc) từ text thô của file.
router.post(
  '/extract-timeline',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung văn bản.' });
    }
    const { patch } = await extractTimelineFromText(text);
    res.status(200).json({ success: true, patch });
  })
);

module.exports = router;
