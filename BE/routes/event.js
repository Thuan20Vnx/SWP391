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

// POST /api/events — Tạo sự kiện mới (club_manager, student, staff)
router.post('/', authenticateAndAuthorize(['student', 'staff', 'club_manager']), async (req, res) => {
  const { title, description, thumbnail, startDate, endDate, location, capacity, category } = req.body;
  if (!title || !startDate || !endDate || !location || !capacity) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc!' });
  }
  try {
    const newEvent = await Event.create({
      title,
      description: description || 'Chưa có mô tả',
      thumbnail: thumbnail || undefined,
      startDate,
      endDate,
      location,
      capacity,
      category: category || 'Workshop',
      createdBy: req.user._id,
      status: 'pending'
    });
    return res.status(201).json({ success: true, message: 'Đề xuất sự kiện đã được gửi thành công!', event: newEvent });
  } catch (error) {
    console.error('Lỗi tạo sự kiện:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/events/my — Lấy sự kiện của user hiện tại
router.get('/my', authenticateAndAuthorize(['club_manager', 'student', 'staff']), async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, events });
  } catch (error) {
    console.error('Lỗi lấy sự kiện của user:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/events/pending — Sự kiện chờ duyệt (CTSV)
router.get('/pending', authenticateAndAuthorize(['ctsv']), async (req, res) => {
  try {
    const events = await Event.find({ status: 'pending' })
      .populate('createdBy', 'fullname email studentId')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, events });
  } catch (error) {
    console.error('Lỗi lấy danh sách sự kiện chờ duyệt:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// PUT /api/events/:id/status — Duyệt/từ chối sự kiện (CTSV)
router.put('/:id/status', authenticateAndAuthorize(['ctsv']), async (req, res) => {
  const { status, rejectionReason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ!' });
  }
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    event.status = status;
    if (status === 'rejected' && rejectionReason) event.rejectionReason = rejectionReason;
    await event.save();
    return res.status(200).json({ success: true, message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} sự kiện!`, event });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

const Registration = require('../src/models/Registration');

// GET /api/events/:id — Lấy chi tiết sự kiện
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'fullname email studentId role');
    if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    
    // Fetch real registrations
    const registrations = await Registration.find({ event: req.params.id }).populate('student', 'fullname studentId email');
    
    const registeredCount = registrations.length;
    const checkinCount = registrations.filter(r => r.status === 'checked-in').length;
    
    // Send back event data with real stats
    const eventData = {
      ...event._doc,
      registeredCount,
      checkinCount,
      reach: event.reach || 0,
      rating: event.rating || 0,
      ratingCount: event.ratingCount || 0
    };

    return res.status(200).json({ success: true, event: eventData, students: registrations });
  } catch (error) {
    console.error('Lỗi lấy chi tiết sự kiện:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// DELETE /api/events/:id — Xóa sự kiện (owner)
router.delete('/:id', authenticateAndAuthorize(['club_manager', 'student', 'staff']), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện!' });
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa sự kiện này!' });
    }
    await Event.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Đã xóa sự kiện thành công!' });
  } catch (error) {
    console.error('Lỗi xóa sự kiện:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// GET /api/events — Lấy tất cả sự kiện đã duyệt (Public)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ status: 'approved' })
      .populate('createdBy', 'fullname email')
      .sort({ startDate: 1 });
    return res.status(200).json({ success: true, events });
  } catch (error) {
    console.error('Lỗi lấy danh sách sự kiện:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
