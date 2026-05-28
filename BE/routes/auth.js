const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const User = require('../src/models/User');
const { signToken } = require('../src/utils/jwt');

// Memory map to hold registrations waiting for OTP confirmation
const pendingUsers = new Map();

// Memory map to hold password resets waiting for OTP confirmation
const pendingResets = new Map();

// ============================================================
// Helper: sanitize user (shortcut to User.sanitizeUser)
// ============================================================
const sanitizeUser = (user) => User.sanitizeUser(user);

const buildGoogleLoginUpdate = (user, { googleId, googlePicture }) => {
  const update = { authProvider: 'google' };
  if (googleId) update.googleId = googleId;
  if (googlePicture && !User.hasCustomAvatar(user)) {
    update.picture = googlePicture;
    update.avatar = googlePicture;
  }
  return update;
};

// ============================================================
// Helper: Get Nodemailer Transporter (Gmail or Ethereal)
// ============================================================
let etherealAccount = null;

const getTransporter = async () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Generate test SMTP service account from ethereal.email if not configured
  if (!etherealAccount) {
    console.log('Tạo tài khoản Ethereal giả lập để test gửi email...');
    etherealAccount = await nodemailer.createTestAccount();
  }

  return nodemailer.createTransport({
    host: etherealAccount.smtp.host,
    port: etherealAccount.smtp.port,
    secure: etherealAccount.smtp.secure,
    auth: {
      user: etherealAccount.user,
      pass: etherealAccount.pass
    }
  });
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

// ============================================================
// Helper: send OTP email
// ============================================================
const sendOtpEmail = async (email, fullname, otp) => {
  // Always write the last OTP to file for automated testing in dev environment
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'last_otp.txt'), otp, 'utf8');
  } catch (e) {
    console.error('Error writing last_otp.txt:', e);
  }

  const transporter = await getTransporter();

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

  const senderEmail = process.env.EMAIL_USER || 'no-reply@fevents.com';

  const mailOptions = {
    from: `"F-Events" <${senderEmail}>`,
    to: email,
    subject: 'Mã xác minh đăng ký F-Events',
    html: htmlContent
  };

  const info = await transporter.sendMail(mailOptions);

  // If using Ethereal (mock), print the URL so user can view the email
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n====================================');
    console.log(`[MOCK EMAIL SENT] Gửi OTP đến: ${email}`);
    console.log(`👀 XEM EMAIL TẠI ĐÂY: ${nodemailer.getTestMessageUrl(info)}`);
    console.log('====================================\n');
  }
};

// ============================================================
// Helper: send Reset OTP email
// ============================================================
const sendResetEmail = async (email, fullname, otp) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'last_otp.txt'), otp, 'utf8');
  } catch (e) {
    console.error('Error writing last_otp.txt:', e);
  }

  const resetLink = `${APP_URL}/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`;

  const transporter = await getTransporter();

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

  const senderEmail = process.env.EMAIL_USER || 'no-reply@fevents.com';

  const mailOptions = {
    from: `"F-Events" <${senderEmail}>`,
    to: email,
    subject: 'Đặt lại mật khẩu F-Events',
    html: htmlContent
  };

  const info = await transporter.sendMail(mailOptions);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n====================================');
    console.log(`[MOCK EMAIL SENT] Gửi OTP khôi phục đến: ${email}`);
    console.log(`👀 XEM EMAIL TẠI ĐÂY: ${nodemailer.getTestMessageUrl(info)}`);
    console.log('====================================\n');
  }
};

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ email và mật khẩu!' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại!'
      });
    }

    // Google-only users don't have passwordHash
    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản này sử dụng đăng nhập Google. Vui lòng đăng nhập bằng Google!'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (isMatch) {
      await User.syncAndPersistUserProfile(user);

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công!',
        user: sanitizeUser(user),
        token: signToken(user)
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại!'
      });
    }
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// ============================================================
// POST /api/auth/signup (Gửi yêu cầu đăng ký và phát OTP)
// ============================================================
router.post('/signup', async (req, res) => {
  const { fullname, email, phone, password } = req.body;

  if (!fullname || !fullname.trim()) {
    return res.status(400).json({ success: false, message: 'Họ và tên không được để trống!' });
  }
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email không được để trống!' });
  }
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Số điện thoại không được để trống!' });
  }
  if (!password) {
    return res.status(400).json({ success: false, message: 'Mật khẩu không được để trống!' });
  }

  try {
    // Check duplicate email
    const emailExists = await User.findOne({ email: email.trim().toLowerCase() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được đăng ký trên hệ thống!'
      });
    }

    // Check duplicate phone
    if (phone.trim()) {
      const phoneExists = await User.findOne({ phone: phone.trim() });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại đã được đăng ký trên hệ thống!'
        });
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const emailKey = email.trim().toLowerCase();

    // Hash password before storing in pending map
    const hashedPassword = await bcrypt.hash(password, 10);

    pendingUsers.set(emailKey, {
      fullname: fullname.trim(),
      email: email.trim(),
      phone: phone.trim(),
      passwordHash: hashedPassword,
      otp: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

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

// ============================================================
// POST /api/auth/verify-otp (Xác nhận OTP và tạo user trong MongoDB)
// ============================================================
router.post('/verify-otp', async (req, res) => {
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

  try {
    // Double-check duplicate before creating
    const duplicate = await User.findOne({ email: emailKey });
    if (duplicate) {
      pendingUsers.delete(emailKey);
      return res.status(400).json({
        success: false,
        message: 'Tài khoản này đã được đăng ký trước đó!'
      });
    }

    // Auto-detect role & studentId from email
    const { role, studentId, course } = await User.detectRole(pendingUser.email);

    const newUser = await User.create({
      fullname: pendingUser.fullname,
      email: pendingUser.email.trim().toLowerCase(),
      phone: pendingUser.phone,
      passwordHash: pendingUser.passwordHash,
      authProvider: 'local',
      role,
      studentId,
      course: course || 'K18',
      campus: 'FPT University Da Nang',
      orientation: '',
      interests: []
    });

    pendingUsers.delete(emailKey);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      user: sanitizeUser(newUser),
      token: signToken(newUser)
    });
  } catch (error) {
    console.error('Lỗi khi tạo tài khoản:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo tài khoản!' });
  }
});

// ============================================================
// POST /api/auth/resend-otp (Gửi lại mã OTP mới)
// ============================================================
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

// ============================================================
// POST /api/auth/forgot-password
// ============================================================
router.post('/forgot-password', async (req, res) => {
  const { contact } = req.body;

  if (!contact) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền Email hoặc Số điện thoại!' });
  }

  try {
    const contactVal = contact.trim().toLowerCase();

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: contactVal },
        { phone: contactVal }
      ]
    });

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

    await sendResetEmail(user.email, user.fullname, otpCode);
    return res.status(200).json({
      success: true,
      message: 'Mã OTP đã được gửi thành công!',
      isPhone: /^[0-9]+$/.test(contactVal),
      email: user.email
    });
  } catch (error) {
    console.error('Lỗi khi gửi email khôi phục mật khẩu:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi mã xác nhận đến email. Vui lòng thử lại sau!'
    });
  }
});

// ============================================================
// POST /api/auth/reset-password (Xác nhận OTP và đổi mật khẩu mới)
// ============================================================
router.post('/reset-password', async (req, res) => {
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

  try {
    const user = await User.findOne({ email: emailKey });

    if (!user) {
      pendingResets.delete(emailKey);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng trên hệ thống!'
      });
    }

    // Hash new password with bcrypt before saving
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    pendingResets.delete(emailKey);

    return res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
    });
  } catch (error) {
    console.error('Lỗi khi đặt lại mật khẩu:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
  }
});

// ============================================================
// POST /api/auth/google (Google Sign-In / SSO)
// ============================================================
router.post('/google', async (req, res) => {
  const { token, email, name, isMock } = req.body;
  const clientId = process.env.GOOGLE_CLIENT_ID || 'mock';

  let googleEmail = '';
  let googleName = '';
  let googlePicture = '';
  let googleId = '';

  try {
    if (clientId !== 'mock' && !isMock) {
      if (!token) {
        return res.status(400).json({ success: false, message: 'Thiếu mã token Google!' });
      }
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId
      });
      const payload = ticket.getPayload();
      googleEmail = payload.email;
      googleName = payload.name || payload.given_name || 'Người dùng Google';
      googlePicture = payload.picture || '';
      googleId = payload.sub || '';
    } else {
      // Mock Google Login in development
      if (!email || !name) {
        return res.status(400).json({ success: false, message: 'Thiếu email hoặc tên cho đăng nhập Google!' });
      }
      googleEmail = email.trim().toLowerCase();
      googleName = name.trim();
      googlePicture = req.body.picture || '';
      googleId = `mock-${googleEmail}`;
    }

    if (!googleEmail) {
      return res.status(400).json({ success: false, message: 'Không thể xác thực email từ Google!' });
    }

    let user = await User.findOne({ email: googleEmail.toLowerCase() });

    if (user) {
      await User.syncAndPersistUserProfile(user, buildGoogleLoginUpdate(user, {
        googleId,
        googlePicture,
      }));
      user = await User.findOne({ email: googleEmail.toLowerCase() });
      return res.status(200).json({
        success: true,
        message: 'Đăng nhập bằng Google thành công!',
        user: sanitizeUser(user),
        token: signToken(user)
      });
    } else {
      // Auto-detect role & studentId from Google email
      const { role, studentId, course } = await User.detectRole(googleEmail);
      const newUser = await User.create({
        fullname: googleName,
        email: googleEmail.toLowerCase(),
        passwordHash: null,
        googleId: googleId || null,
        authProvider: 'google',
        role,
        studentId,
        course: course || 'K18',
        campus: 'FPT University Da Nang',
        orientation: '',
        interests: [],
        picture: googlePicture
      });

      return res.status(201).json({
        success: true,
        message: 'Tự động tạo tài khoản và đăng nhập thành công!',
        user: sanitizeUser(newUser),
        token: signToken(newUser)
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

// ============================================================
// GET /api/auth/google/callback (Google OAuth2 Callback)
// ============================================================
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
  let googleId = '';

  try {
    if (!clientSecret || clientSecret === 'mock') {
      console.log('[MOCK CALLBACK] Client Secret is not set. Simulating login...');
      email = 'kxnhan1507@gmail.com';
      name = 'Nhân Khưu Xuân';
      picture = '';
      googleId = 'mock-kxnhan1507';
    } else {
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
      googleId = payload.sub || '';
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      await User.syncAndPersistUserProfile(user, buildGoogleLoginUpdate(user, {
        googleId,
        googlePicture: picture,
      }));
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      // Auto-detect role & studentId from callback email
      const { role: detectedRole, studentId: detectedStudentId, course: detectedCourse } = await User.detectRole(email);

      user = await User.create({
        fullname: name,
        email: email.toLowerCase(),
        passwordHash: null,
        googleId: googleId || null,
        authProvider: 'google',
        role: detectedRole,
        studentId: detectedStudentId,
        course: detectedCourse || 'K18',
        campus: 'FPT University Da Nang',
        orientation: '',
        interests: [],
        picture: picture
      });
    }

    const authToken = signToken(user);
    return res.redirect(
      `http://localhost:5173/login?auth_status=success&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&token=${encodeURIComponent(authToken)}`
    );

  } catch (error) {
    console.error('Lỗi khi xử lý callback đăng nhập Google:', error.message);
    return res.redirect(`http://localhost:5173/login?auth_status=error&message=${encodeURIComponent('Xác thực tài khoản Google thất bại. Vui lòng thử lại!')}`);
  }
});

module.exports = router;
