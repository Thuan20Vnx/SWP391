const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const authMiddleware = require('../src/middleware/auth');

const sanitizeUser = (user) => User.sanitizeUser(user);

router.use(authMiddleware);

// ============================================================
// GET /api/user/profile
// ============================================================
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.authEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng!' });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin profile:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// ============================================================
// PUT /api/user/profile
// ============================================================
router.put('/profile', async (req, res) => {
  const { fullname, phone, orientation, interests, picture, avatar, course } = req.body;

  try {
    const user = await User.findOne({ email: req.authEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng!' });
    }

    if (fullname !== undefined) {
      if (!fullname.trim()) {
        return res.status(400).json({ success: false, message: 'Họ và tên không được để trống!' });
      }
      user.fullname = fullname.trim();
    }

    if (phone !== undefined) {
      const trimmedPhone = phone.trim();
      if (trimmedPhone) {
        const phoneExists = await User.findOne({
          phone: trimmedPhone,
          _id: { $ne: user._id }
        });
        if (phoneExists) {
          return res.status(400).json({ success: false, message: 'Số điện thoại đã được sử dụng bởi tài khoản khác!' });
        }
        user.phone = trimmedPhone;
      } else {
        user.phone = undefined;
      }
    }

    if (orientation !== undefined) {
      user.orientation = orientation.trim();
    }

    if (interests !== undefined) {
      user.interests = interests;
    }

    if (avatar !== undefined) {
      if (avatar && typeof avatar === 'string' && avatar.length > 0) {
        if (avatar.startsWith('data:') && !avatar.startsWith('data:image/')) {
          return res.status(400).json({ success: false, message: 'Avatar phải là ảnh hợp lệ (data:image/...)!' });
        }
      }
      user.avatar = avatar;
    }

    if (picture !== undefined) {
      if (picture && typeof picture === 'string' && picture.length > 0) {
        if (picture.startsWith('data:') && !picture.startsWith('data:image/')) {
          return res.status(400).json({ success: false, message: 'Picture phải là ảnh hợp lệ (data:image/...)!' });
        }
      }
      user.picture = picture;
    }

    if (course !== undefined && course !== user.course) {
      if (user.courseChanged) {
        return res.status(400).json({ success: false, message: 'Khóa học chỉ được phép thay đổi 1 lần duy nhất!' });
      }
      user.course = course;
      user.courseChanged = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công!',
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật profile:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// ============================================================
// PUT /api/user/change-password
// ============================================================
router.put('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin!' });
  }

  try {
    const user = await User.findOne({ email: req.authEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản này sử dụng đăng nhập Google, không thể đổi mật khẩu!'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác!'
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Thay đổi mật khẩu thành công!'
    });
  } catch (error) {
    console.error('Lỗi khi thay đổi mật khẩu:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

module.exports = router;
