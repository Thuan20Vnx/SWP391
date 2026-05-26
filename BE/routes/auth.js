const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const usersFilePath = path.join(__dirname, '../data/users.json');

// Memory map to hold registrations waiting for OTP confirmation
const pendingUsers = new Map();

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

// Helper to send OTP email
const sendOtpEmail = async (email, fullname, otp) => {
  // Always write the last OTP to file for automated testing in dev environment
  try {
    fs.writeFileSync(path.join(__dirname, '../data/last_otp.txt'), otp, 'utf8');
  } catch (e) {
    console.error('Error writing last_otp.txt:', e);
  }

  const mode = process.env.EMAIL_MODE || 'mock';
  if (mode === 'mock') {
    console.log('\n====================================');
    console.log(`[MOCK EMAIL] Gửi OTP xác thực đến: ${email}`);
    console.log(`[MOCK EMAIL] Mã OTP của bạn là: ${otp}`);
    console.log('====================================\n');
    return true;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const emailTemplate = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác minh tài khoản F-Events</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 10px !important;
      }
      .card {
        padding: 24px 16px !important;
      }
      .btn-group {
        display: block !important;
        text-align: center !important;
      }
      .btn {
        display: block !important;
        margin: 10px 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .btn-secondary {
        margin-left: 0 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #1E293B;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 40px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="560" class="container" style="background-color: #F8FAFC;">
          <!-- Header Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="http://localhost:5173" style="text-decoration: none;">
                <img src="https://lh3.googleusercontent.com/d/1zQNsDmGHl1ho4Xk8SN6dOPXSQVQQbhWM" alt="F-Events Logo" width="64" height="64" style="display: block; border: 0; outline: none;" />
              </a>
              <h1 style="margin: 12px 0 4px 0; font-size: 24px; font-weight: 800; color: #F37021; letter-spacing: -0.5px;">F-Events</h1>
              <p style="margin: 0; font-size: 12px; color: #64748B; font-weight: 500;">Hệ thống quản lý sự kiện dành cho sinh viên FPT University</p>
            </td>
          </tr>
          
          <!-- Inner Card -->
          <tr>
            <td class="card" style="background-color: #FFFFFF; padding: 40px; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);">
              <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 700; color: #1E293B; border-left: 4px solid #F37021; padding-left: 12px;">Xác Minh Tài Khoản</h2>
              
              <p style="font-size: 15px; line-height: 24px; color: #334155; margin-bottom: 8px;">Chào <strong>{{username}}</strong>,</p>
              <p style="font-size: 15px; line-height: 24px; color: #334155; margin-bottom: 24px;">Cảm ơn bạn đã đăng ký tài khoản tại <strong>F-Events</strong>. Để hoàn tất quá trình xác minh email và kích hoạt tài khoản, vui lòng sử dụng mã OTP bên dưới:</p>
              
              <!-- OTP Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #F37021; letter-spacing: 12px; margin-left: 12px;">{{otp}}</span>
                  </td>
                </tr>
              </table>
              
              <!-- Security Warning Bulletpoints -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border-radius: 6px; border-left: 4px solid #FCD34D; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="top" style="font-size: 14px; line-height: 20px; color: #78350F; padding-bottom: 6px;">
                          ⏱️ Mã OTP có hiệu lực trong vòng <strong>{{expiry}} phút</strong>.
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="font-size: 14px; line-height: 20px; color: #78350F; padding-bottom: 6px;">
                          🔒 Tuyệt đối <strong>không chia sẻ</strong> mã xác minh này cho bất kỳ ai.
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="font-size: 14px; line-height: 20px; color: #78350F;">
                          ✉️ Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email an toàn.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- SaaS Buttons -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" class="btn-group" style="padding-top: 8px;">
                    <a href="{{verifyLink}}" class="btn" style="display: inline-block; background: linear-gradient(135deg, #F37021 0%, #D9530F 100%); color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 6px rgba(243, 112, 33, 0.2); transition: all 0.2s ease-in-out;">Xác Minh Tài Khoản</a>
                    <a href="http://localhost:5173" class="btn btn-secondary" style="display: inline-block; background-color: #1E293B; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 6px; margin-left: 12px; transition: all 0.2s ease-in-out;">Truy Cập F-Events</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">© 2026 F-Events Platform</p>
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #94A3B8;">Hệ thống quản lý sự kiện sinh viên FPT University</p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8; line-height: 16px; max-width: 400px;">Đây là email tự động từ hệ thống, vui lòng không phản hồi email này.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const htmlContent = emailTemplate
    .replace(/{{username}}/g, fullname)
    .replace(/{{otp}}/g, otp.split('').join(' '))
    .replace(/{{expiry}}/g, '5')
    .replace(/{{verifyLink}}/g, 'http://localhost:5173/signup');

  const mailOptions = {
    from: `"F-Events Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '[F-Events] Mã xác minh đăng ký tài khoản mới',
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
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

// POST /api/auth/signup (Gửi yêu cầu đăng ký và phát OTP)
router.post('/signup', async (req, res) => {
  const { fullname, email, phone, password } = req.body;

  if (!fullname || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc!' });
  }

  const users = readUsers();
  const duplicate = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() || u.phone === phone.trim());
  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: 'Email hoặc Số điện thoại đã được đăng ký trên hệ thống!'
    });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const emailKey = email.trim().toLowerCase();

  pendingUsers.set(emailKey, {
    fullname: fullname.trim(),
    email: email.trim(),
    phone: phone.trim(),
    password: password,
    otp: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  try {
    await sendOtpEmail(email.trim(), fullname.trim(), otpCode);
    return res.status(200).json({
      success: true,
      status: 'OTP_SENT',
      message: 'Mã xác minh OTP đã được gửi đến email của bạn!'
    });
  } catch (error) {
    console.error('Lỗi khi gửi email xác minh:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi mã xác minh đến email này. Vui lòng thử lại sau!'
    });
  }
});

// POST /api/auth/verify-otp (Xác nhận OTP và ghi nhận tài khoản)
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Thiếu email hoặc mã xác minh OTP!' });
  }

  const emailKey = email.trim().toLowerCase();
  const pendingUser = pendingUsers.get(emailKey);

  if (!pendingUser) {
    return res.status(400).json({
      success: false,
      message: 'Không tìm thấy yêu cầu đăng ký hoặc mã OTP đã hết hạn!'
    });
  }

  if (Date.now() > pendingUser.expiresAt) {
    pendingUsers.delete(emailKey);
    return res.status(400).json({
      success: false,
      message: 'Mã OTP đã hết hạn! Vui lòng đăng ký lại.'
    });
  }

  if (pendingUser.otp !== otp.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Mã xác minh OTP không chính xác. Vui lòng kiểm tra lại!'
    });
  }

  const users = readUsers();
  const duplicate = users.find(u => u.email.toLowerCase() === emailKey || u.phone === pendingUser.phone);
  if (duplicate) {
    pendingUsers.delete(emailKey);
    return res.status(400).json({
      success: false,
      message: 'Tài khoản này đã được đăng ký trước đó!'
    });
  }

  const newUser = {
    fullname: pendingUser.fullname,
    email: pendingUser.email,
    phone: pendingUser.phone,
    password: pendingUser.password,
    course: 'K18',
    campus: 'FPT University Da Nang',
    orientation: '',
    interests: []
  };

  users.push(newUser);
  writeUsers(users);

  pendingUsers.delete(emailKey);

  const { password: _, ...userWithoutPassword } = newUser;
  return res.status(201).json({
    success: true,
    message: 'Đăng ký tài khoản thành công!',
    user: userWithoutPassword
  });
});

// POST /api/auth/resend-otp (Gửi lại mã OTP mới)
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin email!' });
  }

  const emailKey = email.trim().toLowerCase();
  const pendingUser = pendingUsers.get(emailKey);

  if (!pendingUser) {
    return res.status(400).json({
      success: false,
      message: 'Không tìm thấy yêu cầu đăng ký tương ứng cho email này!'
    });
  }

  const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

  pendingUser.otp = newOtpCode;
  pendingUser.expiresAt = Date.now() + 5 * 60 * 1000;
  pendingUsers.set(emailKey, pendingUser);

  try {
    await sendOtpEmail(pendingUser.email, pendingUser.fullname, newOtpCode);
    return res.status(200).json({
      success: true,
      message: 'Mã OTP mới đã được gửi lại vào email của bạn!'
    });
  } catch (error) {
    console.error('Lỗi khi gửi lại OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi lại mã xác minh. Vui lòng thử lại sau!'
    });
  }
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

// POST /api/auth/google (Google Sign-In / SSO)
router.post('/google', async (req, res) => {
  const { token, email, name, isMock } = req.body;
  const clientId = process.env.GOOGLE_CLIENT_ID || 'mock';

  let googleEmail = '';
  let googleName = '';
  let googlePicture = '';

  try {
    if (clientId !== 'mock' && !isMock) {
      if (!token) {
        return res.status(400).json({ success: false, message: 'Thiếu mã token Google!' });
      }
      // Real Google Verification
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId
      });
      const payload = ticket.getPayload();
      googleEmail = payload.email;
      googleName = payload.name || payload.given_name || 'Người dùng Google';
      googlePicture = payload.picture || '';
    } else {
      // Mock Google Login in development
      if (!email || !name) {
        return res.status(400).json({ success: false, message: 'Thiếu email hoặc tên cho đăng nhập Google!' });
      }
      googleEmail = email.trim().toLowerCase();
      googleName = name.trim();
      googlePicture = req.body.picture || '';
    }

    if (!googleEmail) {
      return res.status(400).json({ success: false, message: 'Không thể xác thực email từ Google!' });
    }

    const users = readUsers();
    let userIndex = users.findIndex(u => u.email.toLowerCase() === googleEmail.toLowerCase());

    if (userIndex !== -1) {
      // User exists, update picture if available
      if (googlePicture) {
        users[userIndex].picture = googlePicture;
        writeUsers(users);
      }
      const { password, ...userWithoutPassword } = users[userIndex];
      return res.status(200).json({
        success: true,
        message: 'Đăng nhập bằng Google thành công!',
        user: userWithoutPassword
      });
    } else {
      // User does not exist, auto-signup
      const newUser = {
        fullname: googleName,
        email: googleEmail,
        phone: '',
        password: Math.random().toString(36).slice(-10) + '!',
        course: 'K18',
        campus: 'FPT University Da Nang',
        orientation: '',
        interests: [],
        picture: googlePicture
      };

      users.push(newUser);
      writeUsers(users);

      const { password, ...userWithoutPassword } = newUser;
      return res.status(201).json({
        success: true,
        message: 'Tự động tạo tài khoản và đăng nhập thành công!',
        user: userWithoutPassword
      });
    }
  } catch (error) {
    console.error('Lỗi khi xác thực đăng nhập Google:', error);
    return res.status(500).json({
      success: false,
      message: 'Xác thực tài khoản Google thất bại. Vui lòng thử lại!'
    });
  }
});

// GET /api/auth/google/callback (Google OAuth2 Callback)
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Không nhận được mã code từ Google.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = 'http://localhost:5000/api/auth/google/callback';

  let email = '';
  let name = '';
  let picture = '';

  try {
    if (!clientSecret || clientSecret === 'mock') {
      // Fallback for development/testing without client secret
      console.log('[MOCK CALLBACK] Client Secret is not set. Simulating login...');
      email = 'kxnhan1507@gmail.com';
      name = 'Nhân Khưu Xuân';
      picture = '';
    } else {
      // Real exchange using google-auth-library
      const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name || payload.given_name || 'Người dùng Google';
      picture = payload.picture || '';
    }

    const users = readUsers();
    let userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    if (userIndex !== -1) {
      // User exists, update picture if available
      if (picture) {
        users[userIndex].picture = picture;
        writeUsers(users);
      }
    } else {
      // Auto register
      const newUser = {
        fullname: name,
        email: email,
        phone: '',
        password: Math.random().toString(36).slice(-10) + '!',
        course: 'K18',
        campus: 'FPT University Da Nang',
        orientation: '',
        interests: [],
        picture: picture
      };
      users.push(newUser);
      writeUsers(users);
    }

    // Redirect to React frontend login page with credentials
    return res.redirect(`http://localhost:5173/login?auth_status=success&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);

  } catch (error) {
    console.error('Lỗi khi xử lý callback đăng nhập Google:', error);
    return res.redirect(`http://localhost:5173/login?auth_status=error&message=${encodeURIComponent('Xác thực tài khoản Google thất bại. Vui lòng thử lại!')}`);
  }
});

module.exports = router;
