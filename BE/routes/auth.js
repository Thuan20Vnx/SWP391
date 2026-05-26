const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../data/users.json');

// Helper to read users from file
const readUsers = () => {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Helper to write users to file
const writeUsers = (users) => {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing users file:', error);
  }
};

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ email và mật khẩu!' });
  }

  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);

  if (user) {
    // Return user details (omit password for safety, though this is a mock BE)
    const { password, ...userWithoutPassword } = user;
    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      user: userWithoutPassword
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại!'
    });
  }
});

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { fullname, email, phone, password } = req.body;

  if (!fullname || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc!' });
  }

  const users = readUsers();
  
  // Check duplicate email or phone
  const duplicate = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() || u.phone === phone.trim());
  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: 'Email hoặc Số điện thoại đã được đăng ký trên hệ thống!'
    });
  }

  // Create new user with default K18 profile
  const newUser = {
    fullname: fullname.trim(),
    email: email.trim(),
    phone: phone.trim(),
    password: password,
    course: 'K18',
    campus: 'FPT University Da Nang',
    orientation: '',
    interests: []
  };

  users.push(newUser);
  writeUsers(users);

  const { password: _, ...userWithoutPassword } = newUser;
  return res.status(201).json({
    success: true,
    message: 'Đăng ký tài khoản thành công!',
    user: userWithoutPassword
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { contact } = req.body;

  if (!contact) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền Email hoặc Số điện thoại!' });
  }

  const users = readUsers();
  const contactVal = contact.trim().toLowerCase();
  
  // Find user by email or phone
  const user = users.find(u => u.email.toLowerCase() === contactVal || u.phone === contactVal);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Email hoặc Số điện thoại không tồn tại trên hệ thống!'
    });
  }

  // Success flow
  return res.status(200).json({
    success: true,
    message: 'Mã OTP đã được gửi thành công!',
    isPhone: /^[0-9]+$/.test(contactVal) // Helper for client to show correct text
  });
});

module.exports = router;
