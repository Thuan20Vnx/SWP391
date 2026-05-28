const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const usersFilePath = path.join(__dirname, '../data/users.json');

// Memory map to hold registrations waiting for OTP confirmation
const pendingUsers = new Map();

// Memory map to hold password resets waiting for OTP confirmation
const pendingResets = new Map();

// Helper to read users from file
const readUsers = () => {
  try {
    let data = fs.readFileSync(usersFilePath, 'utf8');
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);
    }
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

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const OTP_EXPIRY_MINUTES = 5;

const buildOtpDigitBoxes = (otp) => {
  const spacer = '<td width="6"></td>';
  const cells = otp.split('').map((digit) =>
    `<td width="44" height="52" align="center" valign="middle" style="background-color:#faf8f6;border:1px solid #e0c0b2;border-radius:8px;font-size:24px;font-weight:600;color:#1e293b;font-family:Consolas,'Courier New',monospace;">${digit}</td>`
  ).join(spacer);
  return `<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:32px auto 28px;"><tr>${cells}</tr></table>`;
};

const buildEmailShell = ({ title, bodyHtml }) => `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f0ed;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:#f3f0ed;padding:48px 16px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="480" role="presentation" style="max-width:480px;width:100%;">
          <tr>
            <td style="padding-bottom:20px;">
              <img src="https://lh3.googleusercontent.com/d/1zQNsDmGHl1ho4Xk8SN6dOPXSQVQQbhWM" alt="F-Events" width="96" height="54" style="display:block;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e8ddd6;border-radius:12px;padding:36px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;font-size:12px;line-height:18px;color:#8a7b72;text-align:center;">
              <p style="margin:0 0 4px;">F-Events · Quản lý sự kiện sinh viên FPT University</p>
              <p style="margin:0;">Email tự động, vui lòng không trả lời.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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

  const otpBoxes = buildOtpDigitBoxes(otp);
  const htmlContent = buildEmailShell({
    title: 'Mã xác minh F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Xác minh đăng ký</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Mã xác minh của bạn</h1>
      <p style="margin:0 0 4px;font-size:15px;line-height:24px;color:#334155;">Xin chào ${fullname},</p>
      <p style="margin:0;font-size:15px;line-height:24px;color:#334155;">Nhập mã bên dưới vào trang đăng ký để hoàn tất tạo tài khoản F-Events cho <strong style="color:#1e293b;">${email}</strong>.</p>
      ${otpBoxes}
      <p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#8a7b72;text-align:center;">Mã có hiệu lực ${OTP_EXPIRY_MINUTES} phút.</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-top:1px solid #f0e8e2;">
        <tr>
          <td style="padding-top:20px;font-size:13px;line-height:20px;color:#8a7b72;">
            Nếu bạn không yêu cầu đăng ký, có thể bỏ qua email này. Không chia sẻ mã với bất kỳ ai.
          </td>
        </tr>
      </table>
    `
  });

  const mailOptions = {
    from: `"F-Events" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Mã xác minh đăng ký F-Events',
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
};

// Helper to send Reset OTP email
const sendResetEmail = async (email, fullname, otp) => {
  // Always write the last OTP to file for automated testing in dev environment
  try {
    fs.writeFileSync(path.join(__dirname, '../data/last_otp.txt'), otp, 'utf8');
  } catch (e) {
    console.error('Error writing last_otp.txt:', e);
  }

  const resetLink = `${APP_URL}/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`;

  const mode = process.env.EMAIL_MODE || 'mock';
  if (mode === 'mock') {
    console.log('\n====================================');
    console.log(`[MOCK EMAIL] Gửi OTP khôi phục mật khẩu đến: ${email}`);
    console.log(`[MOCK EMAIL] Mã OTP của bạn là: ${otp}`);
    console.log(`[MOCK EMAIL] Link khôi phục của bạn là: ${resetLink}`);
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

  const otpBoxes = buildOtpDigitBoxes(otp);
  const htmlContent = buildEmailShell({
    title: 'Khôi phục mật khẩu F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Khôi phục mật khẩu</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Đặt lại mật khẩu</h1>
      <p style="margin:0 0 4px;font-size:15px;line-height:24px;color:#334155;">Xin chào ${fullname},</p>
      <p style="margin:0;font-size:15px;line-height:24px;color:#334155;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong style="color:#1e293b;">${email}</strong>. Dùng mã bên dưới hoặc nút để tiếp tục.</p>
      ${otpBoxes}
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td align="center">
            <a href="${resetLink}" style="display:inline-block;background-color:#f26f21;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Đặt lại mật khẩu</a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#8a7b72;text-align:center;">Mã và liên kết có hiệu lực ${OTP_EXPIRY_MINUTES} phút.</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-top:1px solid #f0e8e2;">
        <tr>
          <td style="padding-top:20px;font-size:13px;line-height:20px;color:#8a7b72;">
            Nếu bạn không yêu cầu thay đổi mật khẩu, hãy bỏ qua email này. Không chia sẻ mã với bất kỳ ai.
          </td>
        </tr>
      </table>
    `
  });

  const mailOptions = {
    from: `"F-Events" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Đặt lại mật khẩu F-Events',
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
router.post('/forgot-password', async (req, res) => {
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

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const emailKey = user.email.toLowerCase();

  pendingResets.set(emailKey, {
    email: user.email,
    otp: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  try {
    await sendResetEmail(user.email, user.fullname, otpCode);
    return res.status(200).json({
      success: true,
      message: 'Mã OTP đã được gửi thành công!',
      isPhone: /^[0-9]+$/.test(contactVal),
      email: user.email // send back the email for client convenience
    });
  } catch (error) {
    console.error('Lỗi khi gửi email khôi phục mật khẩu:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi mã xác nhận đến email. Vui lòng thử lại sau!'
    });
  }
});

// POST /api/auth/reset-password (Xác nhận OTP và đổi mật khẩu mới)
router.post('/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc!' });
  }

  const emailKey = email.trim().toLowerCase();
  const pendingReset = pendingResets.get(emailKey);

  if (!pendingReset) {
    return res.status(400).json({
      success: false,
      message: 'Không tìm thấy yêu cầu đặt lại mật khẩu hoặc mã OTP đã hết hạn!'
    });
  }

  if (Date.now() > pendingReset.expiresAt) {
    pendingResets.delete(emailKey);
    return res.status(400).json({
      success: false,
      message: 'Mã OTP đã hết hạn! Vui lòng thực hiện lại từ trang Quên mật khẩu.'
    });
  }

  if (pendingReset.otp !== otp.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Mã xác minh OTP không chính xác. Vui lòng kiểm tra lại!'
    });
  }

  // Update password in db
  const users = readUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === emailKey);

  if (userIndex === -1) {
    pendingResets.delete(emailKey);
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy người dùng trên hệ thống!'
    });
  }

  // Update password (plain text to match the rest of users.json)
  users[userIndex].password = newPassword;
  writeUsers(users);

  // Clear from pending map
  pendingResets.delete(emailKey);

  return res.status(200).json({
    success: true,
    message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
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
