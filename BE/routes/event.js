const express = require('express');
const router = express.Router();
const Event = require('../src/models/Event');
const User = require('../src/models/User');

// Middleware to verify user and their role by email
const authenticateAndAuthorize = (allowedRoles = []) => {
  return async (req, res, next) => {
    const email = req.headers['x-user-email'] || req.query.email || req.body.email;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Thiếu email xác thực!' });
    }

    try {
      const user = await User.findOne({ email: email.trim().toLowerCase() });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này!' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Lỗi xác thực:', error);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
    }
  };
};

// ============================================================
// POST /api/events
// Create a new event proposal (students and staff only)
// ============================================================
router.post('/', authenticateAndAuthorize(['student', 'staff']), async (req, res) => {
  const { title, description, thumbnail, startDate, endDate, location, capacity } = req.body;

  if (!title || !description || !startDate || !endDate || !location || !capacity) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc!' });
  }

  try {
    const newEvent = await Event.create({
      title,
      description,
      thumbnail: thumbnail || undefined,
      startDate,
      endDate,
      location,
      capacity,
      createdBy: req.user._id,
      status: 'pending' // Default status
    });

    return res.status(201).json({
      success: true,
      message: 'Đề xuất sự kiện đã được gửi thành công và đang chờ duyệt!',
      event: newEvent
    });
  } catch (error) {
    console.error('Lỗi tạo sự kiện:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// ============================================================
// GET /api/events/pending
// Get all pending events (CTSV only)
// ============================================================
router.get('/pending', authenticateAndAuthorize(['ctsv']), async (req, res) => {
  try {
    const events = await Event.find({ status: 'pending' })
      .populate('createdBy', 'fullname email studentId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sự kiện chờ duyệt:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// ============================================================
// PUT /api/events/:id/status
// Approve or reject an event (CTSV only)
// ============================================================
router.put('/:id/status', authenticateAndAuthorize(['ctsv']), async (req, res) => {
  const { status, rejectionReason } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ!' });
  }

  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    }

    event.status = status;
    if (status === 'rejected' && rejectionReason) {
      event.rejectionReason = rejectionReason;
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} sự kiện thành công!`,
      event
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái sự kiện:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// ============================================================
// GET /api/events
// Get all approved events (Public)
// ============================================================
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ status: 'approved' })
      .populate('createdBy', 'fullname email')
      .sort({ startDate: 1 }); // Sort by upcoming events

    return res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sự kiện:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
