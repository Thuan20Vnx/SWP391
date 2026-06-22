const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getReply } = require('../services/aiChatbot.service');

const router = express.Router();

router.post(
  '/message',
  asyncHandler(async (req, res) => {
    const { messages, context } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung tin nhắn.' });
    }

    const { reply, events, announcements, action } = await getReply({ messages, context });
    res.status(200).json({ success: true, reply, events, announcements, action });
  })
);

module.exports = router;
