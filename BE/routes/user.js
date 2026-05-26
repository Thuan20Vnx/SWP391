const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../data/users.json');

// Helper to read users
const readUsers = () => {
  try {
    let data = fs.readFileSync(usersFilePath, 'utf8');
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);
    }
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Helper to write users
const writeUsers = (users) => {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error(error);
  }
};

// GET /api/user/profile
router.get('/profile', (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Thiếu email người dùng!' });
  }

  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng!' });
  }

  const { password, ...userWithoutPassword } = user;
  return res.status(200).json({
    success: true,
    user: userWithoutPassword
  });
});

// PUT /api/user/profile
router.put('/profile', (req, res) => {
  const { email, fullname, phone, orientation, interests, picture, course } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Thiếu email người dùng!' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng!' });
  }

  const currentUser = users[userIndex];

  // Update Họ và tên (Fullname)
  if (fullname !== undefined) {
    if (!fullname.trim()) {
      return res.status(400).json({ success: false, message: 'Họ và tên không được để trống!' });
    }
    currentUser.fullname = fullname.trim();
  }

  // Update Số điện thoại (Phone)
  if (phone !== undefined) {
    currentUser.phone = phone.trim();
  }

  // Update Định hướng (Orientation)
  if (orientation !== undefined) {
    currentUser.orientation = orientation.trim();
  }

  // Update Sở thích (Interests)
  if (interests !== undefined) {
    currentUser.interests = interests;
  }

  // Update Ảnh đại diện (Picture)
  if (picture !== undefined) {
    currentUser.picture = picture;
  }

  // Update Khóa học (Course) - chỉ được thay đổi 1 lần
  if (course !== undefined && course !== currentUser.course) {
    if (currentUser.courseChanged) {
      return res.status(400).json({ success: false, message: 'Khóa học chỉ được phép thay đổi 1 lần duy nhất!' });
    }
    currentUser.course = course;
    currentUser.courseChanged = true;
  }

  writeUsers(users);

  const { password, ...userWithoutPassword } = currentUser;
  return res.status(200).json({
    success: true,
    message: 'Cập nhật thông tin cá nhân thành công!',
    user: userWithoutPassword
  });
});

// PUT /api/user/change-password
router.put('/change-password', (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin!' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
  }

  // Verify current password
  if (users[userIndex].password !== currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu hiện tại không chính xác!'
    });
  }

  // Update to new password
  users[userIndex].password = newPassword;
  writeUsers(users);

  return res.status(200).json({
    success: true,
    message: 'Thay đổi mật khẩu thành công!'
  });
});

module.exports = router;
