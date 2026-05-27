const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const User = require('../src/models/User');

// Memory map to hold registrations waiting for OTP confirmation
const pendingUsers = new Map();

// Memory map to hold password resets waiting for OTP confirmation
const pendingResets = new Map();

// ============================================================
// Helper: sanitize user (shortcut to User.sanitizeUser)
// ============================================================
const sanitizeUser = (user) => User.sanitizeUser(user);

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

  const emailTemplate = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác minh tài khoản F-Events</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .card { padding: 24px 16px !important; }
      .btn-group { display: block !important; text-align: center !important; }
      .btn { display: block !important; margin: 10px 0 !important; width: 100% !important; box-sizing: border-box !important; }
      .btn-secondary { margin-left: 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F8FAFC;padding:40px 0;">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="560" class="container">
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="http://localhost:5173" style="text-decoration:none;">
            <img src="https://lh3.googleusercontent.com/d/1zQNsDmGHl1ho4Xk8SN6dOPXSQVQQbhWM" alt="F-Events Logo" width="64" height="64" style="display:block;border:0;" />
          </a>
          <h1 style="margin:12px 0 4px;font-size:24px;font-weight:800;color:#F37021;">F-Events</h1>
          <p style="margin:0;font-size:12px;color:#64748B;font-weight:500;">Hệ thống quản lý sự kiện dành cho sinh viên FPT University</p>
        </td></tr>
        <tr><td class="card" style="background:#FFF;padding:40px;border-radius:12px;border:1px solid #E2E8F0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <h2 style="margin-top:0;margin-bottom:20px;font-size:20px;font-weight:700;color:#1E293B;border-left:4px solid #F37021;padding-left:12px;">Xác Minh Tài Khoản</h2>
          <p style="font-size:15px;line-height:24px;color:#334155;margin-bottom:8px;">Chào <strong>{{username}}</strong>,</p>
          <p style="font-size:15px;line-height:24px;color:#334155;margin-bottom:24px;">Cảm ơn bạn đã đăng ký tài khoản tại <strong>F-Events</strong>. Mã OTP của bạn:</p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:8px;margin-bottom:24px;">
            <tr><td align="center" style="padding:24px 0;">
              <span style="font-family:'Courier New',monospace;font-size:38px;font-weight:800;color:#F37021;letter-spacing:12px;margin-left:12px;">{{otp}}</span>
            </td></tr>
          </table>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#FFFBEB;border-radius:6px;border-left:4px solid #FCD34D;margin-bottom:28px;">
            <tr><td style="padding:16px;">
              <p style="font-size:14px;color:#78350F;margin:0 0 6px;">⏱️ Mã OTP có hiệu lực trong vòng <strong>{{expiry}} phút</strong>.</p>
              <p style="font-size:14px;color:#78350F;margin:0 0 6px;">🔒 Tuyệt đối <strong>không chia sẻ</strong> mã này cho bất kỳ ai.</p>
              <p style="font-size:14px;color:#78350F;margin:0;">✉️ Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua.</p>
            </td></tr>
          </table>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" class="btn-group" style="padding-top:8px;">
              <a href="{{verifyLink}}" class="btn" style="display:inline-block;background:linear-gradient(135deg,#F37021,#D9530F);color:#FFF;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:6px;">Xác Minh Tài Khoản</a>
              <a href="http://localhost:5173" class="btn btn-secondary" style="display:inline-block;background:#1E293B;color:#FFF;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:6px;margin-left:12px;">Truy Cập F-Events</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top:32px;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">© 2026 F-Events Platform</p>
          <p style="margin:0;font-size:11px;color:#94A3B8;">Đây là email tự động từ hệ thống, vui lòng không phản hồi email này.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const htmlContent = emailTemplate
    .replace(/{{username}}/g, fullname)
    .replace(/{{otp}}/g, otp.split('').join(' '))
    .replace(/{{expiry}}/g, '5')
    .replace(/{{verifyLink}}/g, 'http://localhost:5173/signup');

  const senderEmail = process.env.EMAIL_USER || 'no-reply@fevents.com';
  
  const mailOptions = {
    from: `"F-Events Platform" <${senderEmail}>`,
    to: email,
    subject: '[F-Events] Mã xác minh đăng ký tài khoản mới',
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

  const resetLink = `http://localhost:5173/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`;

  const transporter = await getTransporter();

  const emailTemplate = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Khôi phục mật khẩu F-Events</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .card { padding: 24px 16px !important; }
      .btn { display: block !important; margin: 10px 0 !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#F8FAFC;padding:40px 0;">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="560" class="container">
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="http://localhost:5173" style="text-decoration:none;">
            <h1 style="margin:12px 0 4px;font-size:24px;font-weight:800;color:#F37021;">F-Events</h1>
          </a>
          <p style="margin:0;font-size:12px;color:#64748B;font-weight:500;">Khôi phục mật khẩu tài khoản của bạn</p>
        </td></tr>
        <tr><td class="card" style="background:#FFF;padding:40px;border-radius:12px;border:1px solid #E2E8F0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <h2 style="margin-top:0;margin-bottom:20px;font-size:20px;font-weight:700;color:#1E293B;border-left:4px solid #F37021;padding-left:12px;">Khôi Phục Mật Khẩu</h2>
          <p style="font-size:15px;line-height:24px;color:#334155;margin-bottom:8px;">Chào <strong>${fullname}</strong>,</p>
          <p style="font-size:15px;line-height:24px;color:#334155;margin-bottom:24px;">Mã OTP đặt lại mật khẩu của bạn:</p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:8px;margin-bottom:24px;">
            <tr><td align="center" style="padding:24px 0;">
              <span style="font-family:'Courier New',monospace;font-size:38px;font-weight:800;color:#F37021;letter-spacing:12px;margin-left:12px;">${otp}</span>
            </td></tr>
          </table>
          <p style="font-size:15px;line-height:24px;color:#334155;margin-bottom:24px;">Hoặc click nút dưới đây:</p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${resetLink}" class="btn" style="display:inline-block;background:linear-gradient(135deg,#F37021,#D9530F);color:#FFF;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:6px;">Đặt Lại Mật Khẩu</a>
            </td></tr>
          </table>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#FFFBEB;border-radius:6px;border-left:4px solid #FCD34D;">
            <tr><td style="padding:16px;">
              <p style="font-size:14px;color:#78350F;margin:0 0 6px;">⏱️ Mã OTP có hiệu lực trong vòng <strong>5 phút</strong>.</p>
              <p style="font-size:14px;color:#78350F;margin:0 0 6px;">🔒 Tuyệt đối <strong>không chia sẻ</strong> mã này.</p>
              <p style="font-size:14px;color:#78350F;margin:0;">✉️ Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top:32px;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">© 2026 F-Events Platform</p>
          <p style="margin:0;font-size:11px;color:#94A3B8;">Đây là email tự động từ hệ thống.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const senderEmail = process.env.EMAIL_USER || 'no-reply@fevents.com';

  const mailOptions = {
    from: `"F-Events Platform" <${senderEmail}>`,
    to: email,
    subject: '[F-Events] Yêu cầu khôi phục mật khẩu',
    html: emailTemplate
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
      // Auto-detect role for existing users who don't have role yet
      if (!user.role || user.role === 'guest') {
        const detected = await User.detectRole(user.email);
        if (detected.role !== 'guest') {
          user.role = detected.role;
          user.studentId = detected.studentId;
          await user.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công!',
        user: sanitizeUser(user)
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
    const { role, studentId } = await User.detectRole(pendingUser.email);

    // Create user in MongoDB with hashed password
    const newUser = await User.create({
      fullname: pendingUser.fullname,
      email: pendingUser.email.trim().toLowerCase(),
      phone: pendingUser.phone,
      passwordHash: pendingUser.passwordHash, // Already bcrypt hashed
      authProvider: 'local',
      role: role,
      studentId: studentId,
      course: 'K18',
      campus: 'FPT University Da Nang',
      orientation: '',
      interests: []
    });

    pendingUsers.delete(emailKey);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      user: sanitizeUser(newUser)
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

    let user = await User.findOne({ email: googleEmail.toLowerCase() });

    if (user) {
      // Auto-detect role for existing users who don't have role yet
      let needSave = false;
      if (!user.role || user.role === 'guest') {
        const detected = await User.detectRole(user.email);
        if (detected.role !== 'guest') {
          user.role = detected.role;
          user.studentId = detected.studentId;
          needSave = true;
        }
      }
      // User exists, update picture if available
      if (googlePicture) {
        user.picture = googlePicture;
        needSave = true;
      }
      if (needSave) await user.save();

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập bằng Google thành công!',
        user: sanitizeUser(user)
      });
    } else {
      // Auto-detect role & studentId from Google email
      const { role, studentId } = await User.detectRole(googleEmail);

      // User does not exist, auto-signup (Google user — no passwordHash needed)
      const newUser = await User.create({
        fullname: googleName,
        email: googleEmail.toLowerCase(),
        phone: '',
        passwordHash: null, // Google users don't need a password
        authProvider: 'google',
        role: role,
        studentId: studentId,
        course: 'K18',
        campus: 'FPT University Da Nang',
        orientation: '',
        interests: [],
        picture: googlePicture
      });

      return res.status(201).json({
        success: true,
        message: 'Tự động tạo tài khoản và đăng nhập thành công!',
        user: sanitizeUser(newUser)
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

  try {
    if (!clientSecret || clientSecret === 'mock') {
      console.log('[MOCK CALLBACK] Client Secret is not set. Simulating login...');
      email = 'kxnhan1507@gmail.com';
      name = 'Nhân Khưu Xuân';
      picture = '';
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
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      if (picture) {
        user.picture = picture;
        await user.save();
      }
    } else {
      // Auto-detect role & studentId from callback email
      const { role: detectedRole, studentId: detectedStudentId } = await User.detectRole(email);

      await User.create({
        fullname: name,
        email: email.toLowerCase(),
        phone: '',
        passwordHash: null,
        authProvider: 'google',
        role: detectedRole,
        studentId: detectedStudentId,
        course: 'K18',
        campus: 'FPT University Da Nang',
        orientation: '',
        interests: [],
        picture: picture
      });
    }

    return res.redirect(`http://localhost:5173/login?auth_status=success&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);

  } catch (error) {
    console.error('Lỗi khi xử lý callback đăng nhập Google:', error);
    return res.redirect(`http://localhost:5173/login?auth_status=error&message=${encodeURIComponent('Xác thực tài khoản Google thất bại. Vui lòng thử lại!')}`);
  }
});

module.exports = router;
