const express = require('express');
const router = express.Router();
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { normalizeRole } = require('../utils/role');
const { addClient, removeClient } = require('../services/notification.service');

const getAuthenticatedUser = async (req) => {
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';
  const token = String(req.query.token || headerToken || '').trim();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload.email) return null;
  return User.findOne({ email: payload.email.trim().toLowerCase() }).lean();
};

const recipientFilter = (user) => ({
  $or: [
    { recipientRoles: normalizeRole(user.role) },
    { recipientEmails: String(user.email || '').trim().toLowerCase() }
  ]
});

const visibleFilter = (user) => ({
  $and: [
    recipientFilter(user),
    { deletedByEmails: { $ne: String(user.email || '').trim().toLowerCase() } }
  ]
});

const formatForUser = (notification, email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const readBy = Array.isArray(notification.readByEmails) ? notification.readByEmails : [];
  return {
    ...notification,
    id: notification._id,
    isRead: readBy.includes(normalizedEmail) || (readBy.length === 0 && notification.isRead === true)
  };
};

// GET /api/notifications/stream — SSE endpoint, auth via ?token= query param
router.get('/stream', async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.status(401).json({ success: false, message: 'Thiếu token xác thực!' });
  }

  let user;
  try {
    user = await getAuthenticatedUser(req);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
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

  addClient(clientId, res, role, user.email);

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
  let user;
  try {
    user = await getAuthenticatedUser(req);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
  if (!user) {
    return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });
  }

  try {
    const notifications = await Notification.find(visibleFilter(user))
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      notifications: notifications.map((n) => formatForUser(n, user.email))
    });
  } catch (err) {
    console.error('GET /notifications:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/notifications/read-all — đánh dấu tất cả đã đọc
router.patch('/read-all', async (req, res) => {
  let user;
  try {
    user = await getAuthenticatedUser(req);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
  if (!user) {
    return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });
  }

  try {
    await Notification.updateMany(recipientFilter(user), {
      $addToSet: { readByEmails: String(user.email).trim().toLowerCase() }
    });
    return res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc.' });
  } catch (err) {
    console.error('PATCH /notifications/read-all:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PATCH /api/notifications/:id/read — đánh dấu một thông báo đã đọc
router.patch('/:id/read', async (req, res) => {
  let user;
  try {
    user = await getAuthenticatedUser(req);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
  if (!user) return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...recipientFilter(user) },
      { $addToSet: { readByEmails: String(user.email).trim().toLowerCase() } },
      { new: true }
    ).lean();
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo!' });
    }
    return res.json({ success: true, notification: formatForUser(notification, user.email) });
  } catch (err) {
    console.error('PATCH /notifications/:id/read:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// DELETE /api/notifications/all — xóa (ẩn) tất cả thông báo của user hiện tại
router.delete('/all', async (req, res) => {
  let user;
  try {
    user = await getAuthenticatedUser(req);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
  if (!user) {
    return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });
  }

  try {
    await Notification.updateMany(recipientFilter(user), {
      $addToSet: { deletedByEmails: String(user.email).trim().toLowerCase() }
    });
    return res.json({ success: true, message: 'Đã xóa tất cả thông báo.' });
  } catch (err) {
    console.error('DELETE /notifications/all:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// DELETE /api/notifications/:id — xóa (ẩn) một thông báo của user hiện tại
router.delete('/:id', async (req, res) => {
  let user;
  try {
    user = await getAuthenticatedUser(req);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
  if (!user) return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...recipientFilter(user) },
      { $addToSet: { deletedByEmails: String(user.email).trim().toLowerCase() } },
      { new: true }
    ).lean();
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo!' });
    }
    return res.json({ success: true, message: 'Đã xóa thông báo.' });
  } catch (err) {
    console.error('DELETE /notifications/:id:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
