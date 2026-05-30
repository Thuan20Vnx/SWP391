const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { APP_URL, OTP_EXPIRY_MINUTES } = require('../config/env');

let etherealAccount = null;

const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS) || 12_000;

const hasSmtpCredentials = () => {
  const user = String(process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASS || '').trim();
  return Boolean(user && pass);
};

const getTransporter = async () => {
  if (hasSmtpCredentials()) {
    const user = String(process.env.EMAIL_USER).trim();
    const pass = String(process.env.EMAIL_PASS).trim();
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });
  }

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
      pass: etherealAccount.pass,
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
};

const sendMailInBackground = (params) => {
  sendMail(params).catch((err) => {
    console.error(`[Email] Gửi nền thất bại (${params.to}):`, err.message);
  });
};

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

const writeDevFile = (filename, content) => {
  try {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, filename), content, 'utf8');
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
  }
};

const writeDevOtp = (otp) => writeDevFile('last_otp.txt', otp);

const sendMail = async ({ to, subject, html }) => {
  const transporter = await getTransporter();
  const smtp = hasSmtpCredentials();
  const senderEmail = smtp ? String(process.env.EMAIL_USER).trim() : 'no-reply@fevents.com';

  let info;
  try {
    info = await transporter.sendMail({
      from: `"F-Events" <${senderEmail}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    const hint = smtp
      ? ' Kiểm tra EMAIL_USER/EMAIL_PASS (App Password Gmail, bật 2FA).'
      : '';
    throw new Error(`Không gửi được email: ${err.message}.${hint}`);
  }

  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  const provider = smtp ? 'gmail' : 'ethereal';

  if (!smtp) {
    console.log('\n====================================');
    console.log(`[EMAIL TEST - không tới hộp thư thật] Gửi đến: ${to}`);
    if (previewUrl) console.log(`👀 XEM EMAIL TEST: ${previewUrl}`);
    console.log('💡 Cấu hình EMAIL_USER + EMAIL_PASS trong BE/.env để gửi Gmail thật.');
    console.log('====================================\n');
  } else {
    console.log(`[EMAIL] Đã gửi tới ${to} qua Gmail SMTP`);
  }

  return { messageId: info.messageId, previewUrl, provider };
};

const sendOtpEmail = async (email, fullname, otp) => {
  writeDevOtp(otp);

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
    `,
  });

  await sendMail({
    to: email,
    subject: 'Mã xác minh đăng ký F-Events',
    html: htmlContent,
  });
};

const sendActivationEmail = async (email, fullname, password) => {
  const loginUrl = `${APP_URL}/login`;
  const htmlContent = buildEmailShell({
    title: 'Kích hoạt tài khoản F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Tài khoản mới</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Chào mừng đến F-Events</h1>
      <p style="margin:0 0 4px;font-size:15px;line-height:24px;color:#334155;">Xin chào ${fullname},</p>
      <p style="margin:0;font-size:15px;line-height:24px;color:#334155;">Quản trị viên đã tạo tài khoản cho <strong style="color:#1e293b;">${email}</strong>. Mật khẩu mặc định của bạn là:</p>
      <p style="margin:24px 0;font-size:22px;font-weight:700;text-align:center;color:#f26f21;letter-spacing:1px;">${password}</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td align="center">
            <a href="${loginUrl}" style="display:inline-block;background-color:#f26f21;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Đăng nhập ngay</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:20px;color:#8a7b72;">Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên.</p>
    `,
  });

  await sendMail({
    to: email,
    subject: 'Tài khoản F-Events của bạn đã được kích hoạt',
    html: htmlContent,
  });
};

module.exports = {
  sendOtpEmail,
  sendActivationEmail,
  sendMailInBackground,
};
