const express = require('express');
const router = express.Router();
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { normalizeRole } = require('../utils/role');
const { addClient, removeClient } = require('../services/notification.service');

// GET /api/notifications/stream — SSE endpoint, auth via ?token= query param
router.get('/stream', async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.status(401).json({ success: false, message: 'Thiếu token xác thực!' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }

  if (!payload.email) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ!' });
  }

  let user;
  try {
    user = await User.findOne({ email: payload.email.trim().toLowerCase() }).lean();
  } catch {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });
  }

  const role = normalizeRole(user.role);
  const clientId = `${user._id}_${Date.now()}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send a connected ping
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, role })}\n\n`);

  addClient(clientId, res, role);

  // Heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(clientId);
  });
});

// GET /api/notifications — lấy thông báo cho user hiện tại theo role
router.get('/', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Thiếu token xác thực!' });
  }
  const token = header.slice(7);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
  if (!payload.email) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ!' });
  }

  let user;
  try {
    user = await User.findOne({ email: payload.email.trim().toLowerCase() }).lean();
  } catch {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
  if (!user) {
    return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });
  }

  const role = normalizeRole(user.role);

  try {
    const notifications = await Notification.find({ recipientRoles: role })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      notifications: notifications.map((n) => ({
        ...n,
        id: n._id
      }))
    });
  } catch (err) {
    console.error('GET /notifications:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/notifications/read-all — đánh dấu tất cả đã đọc
router.patch('/read-all', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Thiếu token xác thực!' });
  }
  const token = header.slice(7);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
  if (!payload.email) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ!' });
  }

  let user;
  try {
    user = await User.findOne({ email: payload.email.trim().toLowerCase() }).lean();
  } catch {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
  if (!user) {
    return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });
  }

  const role = normalizeRole(user.role);

  try {
    await Notification.updateMany({ recipientRoles: role, isRead: false }, { $set: { isRead: true } });
    return res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc.' });
  } catch (err) {
    console.error('PATCH /notifications/read-all:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/notifications/:id/read — đánh dấu một thông báo đã đọc
router.patch('/:id/read', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Thiếu token xác thực!' });
  }
  const token = header.slice(7);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
  if (!payload.email) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ!' });
  }

  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { isRead: true } },
      { new: true }
    ).lean();
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo!' });
    }
    return res.json({ success: true, notification: { ...notification, id: notification._id } });
  } catch (err) {
    console.error('PATCH /notifications/:id/read:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
