const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { APP_URL, OTP_EXPIRY_MINUTES } = require('../config/env');

let etherealAccount = null;

const DEFAULT_SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS) || 12_000;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_ACCOUNT_URL = 'https://api.brevo.com/v3/account';

const hasSmtpCredentials = () => {
  const user = String(process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASS || '').trim();
  return Boolean(user && pass);
};

const hasBrevoApiKey = () => Boolean(String(process.env.BREVO_API_KEY || '').trim());

const getBrevoApiKey = () => {
  const key = String(process.env.BREVO_API_KEY || '').trim();
  if (!key) return '';
  if (key.startsWith('xsmtpsib-')) {
    throw new Error(
      'BREVO_API_KEY đang là SMTP key (xsmtpsib-...). Hãy tạo API key (xkeysib-...) tại Brevo → Settings → SMTP & API → API Keys.'
    );
  }
  return key;
};

const hasEmailDeliveryConfigured = () => hasBrevoApiKey() || hasSmtpCredentials();

const assertEmailDeliveryReady = async () => {
  const cfg = await getEmailRuntimeConfig();
  if (cfg && cfg.enabled === false) {
    throw new Error('SMTP đang tắt trong cấu hình hệ thống.');
  }
  if (hasEmailDeliveryConfigured()) return;

  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProd) {
    throw new Error('BREVO_API_KEY hoặc EMAIL_USER/EMAIL_PASS chưa được cấu hình trên server production.');
  }
};

// Đọc cấu hình SMTP từ DB (host/port/encryption/timeout) — credentials vẫn lấy từ .env.
const getEmailRuntimeConfig = async () => {
  try {
    // require trễ để tránh phụ thuộc vòng khi khởi động
    const { getEmailSettings } = require('./systemSettings.service');
    const cfg = await getEmailSettings();
    return cfg;
  } catch {
    return null;
  }
};

const resolveSmtpRuntime = async () => {
  const cfg = await getEmailRuntimeConfig();
  const host = String(process.env.SMTP_HOST || cfg?.host || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || cfg?.port || 587);
  const encryption = String(process.env.SMTP_ENCRYPTION || cfg?.encryption || 'TLS').toUpperCase();
  const secure = encryption === 'SSL' || port === 465;
  const timeoutMs = cfg?.timeoutSeconds
    ? Number(cfg.timeoutSeconds) * 1000
    : DEFAULT_SMTP_TIMEOUT_MS;
  return { host, port, secure, timeoutMs, cfg };
};

const resolveMailSender = async () => {
  const cfg = await getEmailRuntimeConfig();
  const fromName = cfg?.fromName || process.env.EMAIL_FROM_NAME || 'F-Events';
  const senderEmail = (
    String(process.env.EMAIL_FROM || '').trim()
    || String(cfg?.fromEmail || '').trim()
    || String(process.env.EMAIL_USER || '').trim()
    || 'no-reply@fevents.com'
  );
  const replyTo = String(cfg?.replyTo || process.env.EMAIL_REPLY_TO || '').trim();
  return { fromName, senderEmail, replyTo, cfg };
};

const sendViaBrevoApi = async ({ to, subject, html, fromName, senderEmail, replyTo }) => {
  const apiKey = getBrevoApiKey();
  const payload = {
    sender: { name: fromName, email: senderEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };
  if (replyTo) payload.replyTo = { email: replyTo };

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errData = await response.json();
      detail = errData?.message || JSON.stringify(errData);
    } catch {
      detail = await response.text();
    }
    throw new Error(`Brevo API (${response.status}): ${detail}`);
  }

  const data = await response.json().catch(() => ({}));
  return { messageId: data?.messageId || null, previewUrl: null, provider: 'brevo-api' };
};

const getTransporter = async () => {
  const { host, port, secure, timeoutMs } = await resolveSmtpRuntime();

  if (hasSmtpCredentials()) {
    const user = String(process.env.EMAIL_USER).trim();
    const pass = String(process.env.EMAIL_PASS).trim();
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: timeoutMs,
      greetingTimeout: timeoutMs,
      socketTimeout: timeoutMs,
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
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
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
              <img src="https://lh3.googleusercontent.com/d/1zQNsDmGHl1ho4Xk8SN6dOPXSQVQQbhWM" alt="F-Events" height="40" style="display:block;border:0;height:40px;width:auto;max-width:180px;" />
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
  await assertEmailDeliveryReady();
  const { fromName, senderEmail, replyTo, cfg } = await resolveMailSender();

  if (hasBrevoApiKey()) {
    try {
      const result = await sendViaBrevoApi({ to, subject, html, fromName, senderEmail, replyTo });
      console.log(`[EMAIL] Đã gửi tới ${to} qua Brevo API (from: ${senderEmail})`);
      return result;
    } catch (err) {
      console.error(`[Email] Brevo API thất bại (from: ${senderEmail}):`, err.message);
      throw new Error(
        `Không gửi được email: ${err.message}. Kiểm tra BREVO_API_KEY và địa chỉ gửi đã verify trên Brevo.`
      );
    }
  }

  const { host } = await resolveSmtpRuntime();
  const transporter = await getTransporter();
  const smtp = hasSmtpCredentials();

  let info;
  try {
    info = await transporter.sendMail({
      from: `"${fromName}" <${senderEmail}>`,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject,
      html,
    });
  } catch (err) {
    console.error(`[Email] Gửi thất bại qua ${host} (from: ${senderEmail}):`, err.message);
    const renderHint = /timeout|ETIMEDOUT|ECONNREFUSED/i.test(err.message)
      ? ' Render free tier chặn SMTP (cổng 587) — hãy dùng BREVO_API_KEY (HTTP API).'
      : '';
    const hint = smtp
      ? ` Kiểm tra EMAIL_USER/EMAIL_PASS và SMTP host.${renderHint}`
      : '';
    throw new Error(`Không gửi được email: ${err.message}.${hint}`);
  }

  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  const provider = smtp ? 'smtp' : 'ethereal';

  if (!smtp) {
    console.log('\n====================================');
    console.log(`[EMAIL TEST - không tới hộp thư thật] Gửi đến: ${to}`);
    if (previewUrl) console.log(`👀 XEM EMAIL TEST: ${previewUrl}`);
    console.log('💡 Cấu hình BREVO_API_KEY hoặc EMAIL_USER + EMAIL_PASS trong BE/.env.');
    console.log('====================================\n');
  } else {
    console.log(`[EMAIL] Đã gửi tới ${to} qua SMTP ${host}`);
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

const sendPartnerTerminationEmail = async ({ to, partnerName, reason, adminEmail }) => {
  const htmlContent = buildEmailShell({
    title: 'Yêu cầu hủy hợp tác',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Thông báo từ Admin F-Events</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Yêu cầu hủy hợp tác</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#334155;">Kính gửi <strong>${partnerName}</strong>,</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#334155;">Admin (<strong>${adminEmail || 'F-Events'}</strong>) đã gửi yêu cầu hủy hợp tác trên hệ thống F-Events.</p>
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e293b;">Lý do:</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#334155;background:#faf8f6;border:1px solid #e8ddd6;border-radius:8px;padding:12px 14px;">${reason}</p>
      <p style="margin:0;font-size:13px;line-height:20px;color:#8a7b72;">Vui lòng đăng nhập cổng đối tác để xem thông báo chi tiết và phản hồi nếu cần.</p>
    `,
  });

  return sendMail({
    to,
    subject: `[F-Events] Yêu cầu hủy hợp tác — ${partnerName}`,
    html: htmlContent,
  });
};

const sendPartnerAdminNoticeEmail = async ({ to, partnerName, title, content, adminEmail }) => {
  const htmlContent = buildEmailShell({
    title: title || 'Thông báo từ Admin',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Thông báo Admin → ${partnerName}</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">${title}</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#334155;white-space:pre-wrap;">${content}</p>
      <p style="margin:0;font-size:13px;line-height:20px;color:#8a7b72;">Gửi bởi ${adminEmail || 'Admin F-Events'}.</p>
    `,
  });

  return sendMail({
    to,
    subject: `[F-Events] ${title}`,
    html: htmlContent,
  });
};

const sendResetEmail = async (email, fullname, otp) => {
  writeDevOtp(otp);

  const resetLink = `${APP_URL}/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`;
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
    `,
  });

  await sendMail({
    to: email,
    subject: 'Đặt lại mật khẩu F-Events',
    html: htmlContent,
  });
};

const sendLoginLockAlertEmail = async (email, fullname, unlockToken) => {
  const unlockLink = `${APP_URL}/unlock-account?token=${encodeURIComponent(unlockToken)}`;
  const htmlContent = buildEmailShell({
    title: 'Cảnh báo bảo mật F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#b42318;">Cảnh báo bảo mật</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Tài khoản bị khóa tạm thời</h1>
      <p style="margin:0 0 4px;font-size:15px;line-height:24px;color:#334155;">Xin chào ${fullname},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#334155;">Chúng tôi phát hiện <strong style="color:#b42318;">quá nhiều lần đăng nhập sai mật khẩu</strong> cho tài khoản <strong style="color:#1e293b;">${email}</strong>. Để bảo vệ tài khoản, hệ thống đã khóa đăng nhập.</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#334155;">Nếu đây là bạn, bấm nút bên dưới để mở khóa và đăng nhập lại. Nếu không phải bạn, hãy đổi mật khẩu ngay sau khi mở khóa.</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td align="center">
            <a href="${unlockLink}" style="display:inline-block;background-color:#f26f21;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Mở khóa tài khoản</a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#8a7b72;text-align:center;">Liên kết có hiệu lực 24 giờ. Chỉ mở khóa được bằng email này.</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-top:1px solid #f0e8e2;">
        <tr>
          <td style="padding-top:20px;font-size:13px;line-height:20px;color:#8a7b72;">
            Nếu bạn không cố đăng nhập, có thể ai đó đang thử truy cập trái phép. Liên hệ quản trị viên nếu cần hỗ trợ thêm.
          </td>
        </tr>
      </table>
    `,
  });

  await sendMail({
    to: email,
    subject: '[F-Events] Cảnh báo — Tài khoản bị khóa do đăng nhập sai',
    html: htmlContent,
  });
};

const sendPartnerCtsvReportEmail = async ({
  to,
  partnerName,
  eventTitle,
  ctsvEmail,
  analyticsPath = '/partner/analytics',
}) => {
  const detailUrl = `${APP_URL}${analyticsPath}`;
  const htmlContent = buildEmailShell({
    title: 'Báo cáo sau sự kiện',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Báo cáo từ CTSV → ${partnerName}</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Báo cáo sau sự kiện — ${eventTitle}</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#334155;">
        Công tác Sinh viên đã gửi báo cáo kết quả sau sự kiện của bạn. Vui lòng đăng nhập cổng đối tác để xem chi tiết số liệu đăng ký, check-in và đánh giá.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td align="center">
            <a href="${detailUrl}" style="display:inline-block;background-color:#f26f21;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Xem báo cáo</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:20px;color:#8a7b72;">Gửi bởi ${ctsvEmail || 'CTSV F-Events'}.</p>
    `,
  });

  return sendMail({
    to,
    subject: `[F-Events] Báo cáo sau sự kiện — ${eventTitle}`,
    html: htmlContent,
  });
};

const sendTestEmail = async (to) => {
  const recipient = String(to || '').trim();
  if (!recipient) throw new Error('Vui lòng nhập email nhận thử nghiệm.');

  const cfg = await getEmailRuntimeConfig();
  const htmlContent = buildEmailShell({
    title: 'Email thử nghiệm F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Kiểm tra cấu hình SMTP</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Cấu hình email hoạt động!</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#334155;">Đây là email thử nghiệm được gửi từ trang Kiểm soát hệ thống F-Events.</p>
      <p style="margin:0;font-size:14px;line-height:22px;color:#64748b;">
        SMTP host: <strong>${cfg?.host || 'smtp.gmail.com'}</strong><br/>
        Cổng: <strong>${cfg?.port || 587}</strong> · Mã hóa: <strong>${cfg?.encryption || 'TLS'}</strong>
      </p>
    `,
  });

  const result = await sendMail({
    to: recipient,
    subject: '[F-Events] Email thử nghiệm cấu hình SMTP',
    html: htmlContent,
  });
  return result;
};

/**
 * Kiểm tra kết nối SMTP cho trang Kiểm soát hệ thống.
 * Trả về { status, latencyMs, host, mode, detail } — không bao giờ throw.
 */
const verifySmtpConnection = async () => {
  const cfg = await getEmailRuntimeConfig();
  const host = `${process.env.SMTP_HOST || cfg?.host || 'smtp.gmail.com'}:${process.env.SMTP_PORT || cfg?.port || 587}`;
  const smtp = hasSmtpCredentials();

  if (cfg && cfg.enabled === false) {
    return { status: 'degraded', latencyMs: null, host, mode: 'disabled', detail: 'SMTP đang tắt trong cấu hình' };
  }

  if (hasBrevoApiKey()) {
    const started = Date.now();
    try {
      const response = await fetch(BREVO_ACCOUNT_URL, {
        headers: { accept: 'application/json', 'api-key': getBrevoApiKey() },
      });
      const latencyMs = Date.now() - started;
      if (!response.ok) {
        const detail = await response.text();
        return {
          status: 'degraded',
          latencyMs,
          host: 'api.brevo.com',
          mode: 'brevo-api',
          detail: `Brevo API lỗi (${response.status}): ${detail}`,
        };
      }
      return {
        status: 'online',
        latencyMs,
        host: 'api.brevo.com',
        mode: 'brevo-api',
        detail: 'Brevo HTTP API sẵn sàng (không dùng SMTP — phù hợp Render free tier)',
      };
    } catch (err) {
      return {
        status: 'degraded',
        latencyMs: Date.now() - started,
        host: 'api.brevo.com',
        mode: 'brevo-api',
        detail: `Không kết nối được Brevo API: ${err.message}`,
      };
    }
  }

  const started = Date.now();
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    const latencyMs = Date.now() - started;
    return {
      status: 'online',
      latencyMs,
      host,
      mode: smtp ? 'smtp' : 'ethereal',
      detail: smtp ? 'SMTP sẵn sàng' : 'Ethereal (giả lập) sẵn sàng',
    };
  } catch (err) {
    const renderHint = /timeout|ETIMEDOUT|ECONNREFUSED/i.test(err.message)
      ? ' (Render free tier chặn cổng SMTP — dùng BREVO_API_KEY)'
      : '';
    return {
      status: 'degraded',
      latencyMs: Date.now() - started,
      host,
      mode: smtp ? 'smtp' : 'ethereal',
      detail: `Không kết nối được SMTP: ${err.message}${renderHint}`,
    };
  }
};

const sendPaymentConfirmationEmail = async ({ to, fullname, eventTitle, amount, code, paidAt }) => {
  const paidAtStr = paidAt
    ? new Date(paidAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : '';
  const amountStr = Number(amount).toLocaleString('vi-VN') + ' ₫';

  const htmlContent = buildEmailShell({
    title: 'Xác nhận thanh toán vé — F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Thanh toán thành công</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Vé của bạn đã được xác nhận</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#334155;">Xin chào ${fullname},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#334155;">Thanh toán của bạn cho sự kiện <strong style="color:#1e293b;">${eventTitle}</strong> đã được xác nhận thành công.</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:#faf8f6;border:1px solid #e8ddd6;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#8a7b72;padding-bottom:8px;">Mã đơn</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#1e293b;font-family:Consolas,'Courier New',monospace;padding-bottom:8px;">${code}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#8a7b72;padding-bottom:8px;">Số tiền</td>
              <td align="right" style="font-size:14px;font-weight:700;color:#f26f21;padding-bottom:8px;">${amountStr}</td>
            </tr>
            ${paidAtStr ? `<tr>
              <td style="font-size:13px;color:#8a7b72;">Thời gian</td>
              <td align="right" style="font-size:13px;color:#334155;">${paidAtStr}</td>
            </tr>` : ''}
          </table>
        </td></tr>
      </table>
      <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#8a7b72;">Bạn có thể xem vé và lịch sử thanh toán trong mục <strong>Vé của tôi</strong> trên F-Events.</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-top:1px solid #f0e8e2;">
        <tr>
          <td style="padding-top:20px;font-size:13px;line-height:20px;color:#8a7b72;">
            Nếu bạn không thực hiện thanh toán này, hãy liên hệ ban tổ chức ngay.
          </td>
        </tr>
      </table>
    `,
  });

  await sendMail({ to, subject: `Xác nhận thanh toán vé: ${eventTitle}`, html: htmlContent });
};

// ─── Nhắc mở đăng ký & sắp diễn ra ────────────────────────────────────────────

const pad2 = (n) => String(n).padStart(2, '0');

const toGCalDate = (value) => {
  const d = new Date(value);
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
};

const fmtVnDateTime = (value) =>
  new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const buildGoogleCalendarUrl = ({ title, start, end, details = '', location = '' }) => {
  const startDate = start ? new Date(start) : new Date();
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Sự kiện F-Events',
    dates: `${toGCalDate(startDate)}/${toGCalDate(endDate)}`,
    details,
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const infoRow = (label, value) => `
  <tr>
    <td style="font-size:13px;color:#8a7b72;padding:7px 0;white-space:nowrap;vertical-align:top;">${label}</td>
    <td align="right" style="font-size:14px;font-weight:600;color:#1e293b;padding:7px 0;line-height:20px;">${value}</td>
  </tr>`;

const infoCard = (rows) => `
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:#faf8f6;border:1px solid #e8ddd6;border-radius:10px;margin:0 0 24px;">
    <tr><td style="padding:6px 18px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>
    </td></tr>
  </table>`;

const ctaButton = (href, label, bg = '#f26f21') => `
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin:0 0 12px;">
    <tr><td align="center">
      <a href="${href}" style="display:inline-block;background-color:${bg};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 30px;border-radius:8px;">${label}</a>
    </td></tr>
  </table>`;

/** Mail xác nhận khi bấm "Nhắc tôi khi mở đăng ký". */
const sendReminderSignupEmail = async ({
  to,
  fullname,
  eventTitle,
  eventStart,
  eventEnd,
  location,
  registrationStart,
  eventUrl,
}) => {
  const greeting = fullname ? `Xin chào ${fullname},` : 'Xin chào bạn,';
  const calendarUrl = buildGoogleCalendarUrl({
    title: `Mở đăng ký: ${eventTitle}`,
    start: registrationStart,
    end: new Date(new Date(registrationStart).getTime() + 30 * 60 * 1000),
    details: `Mở đăng ký vé sự kiện "${eventTitle}" trên F-Events.\n${eventUrl || ''}`,
    location: location || '',
  });

  const htmlContent = buildEmailShell({
    title: 'Đã đặt nhắc mở đăng ký — F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Nhắc mở đăng ký</p>
      <h1 style="margin:0 0 18px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Chúng tôi sẽ nhắc bạn</h1>
      <p style="margin:0 0 6px;font-size:15px;line-height:24px;color:#334155;">${greeting}</p>
      <p style="margin:0 0 22px;font-size:15px;line-height:24px;color:#334155;">Bạn đã đặt nhắc cho sự kiện <strong style="color:#1e293b;">${eventTitle}</strong>. Chúng tôi sẽ gửi email nhắc bạn <strong>trước 5 phút khi mở đăng ký</strong> để bạn kịp giữ vé.</p>
      ${infoCard(
        infoRow('Mở đăng ký lúc', fmtVnDateTime(registrationStart)) +
        infoRow('Sự kiện diễn ra', fmtVnDateTime(eventStart)) +
        (location ? infoRow('Địa điểm', location) : '')
      )}
      ${ctaButton(calendarUrl, 'Thêm vào Google Calendar')}
      ${eventUrl ? ctaButton(eventUrl, 'Xem chi tiết sự kiện', '#1e293b') : ''}
      <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#8a7b72;border-top:1px solid #f0e8e2;padding-top:18px;">Bạn nhận email này vì đã bấm "Nhắc tôi" trên F-Events. Nếu không phải bạn, có thể bỏ qua email này.</p>
    `,
  });

  return sendMail({ to, subject: `Đã đặt nhắc mở đăng ký: ${eventTitle}`, html: htmlContent });
};

/** Mail nhắc trước khi mở đăng ký (≈5 phút). */
const sendRegistrationOpeningSoonEmail = async ({
  to,
  fullname,
  eventTitle,
  registrationStart,
  minutesLeft,
  eventUrl,
}) => {
  const greeting = fullname ? `Xin chào ${fullname},` : 'Xin chào bạn,';
  const minLabel = minutesLeft > 0 ? `còn khoảng ${minutesLeft} phút nữa` : 'ngay bây giờ';
  const htmlContent = buildEmailShell({
    title: 'Sắp mở đăng ký — F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#f26f21;font-weight:600;">Sắp mở đăng ký</p>
      <h1 style="margin:0 0 18px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Chuẩn bị giữ vé — ${minLabel}!</h1>
      <p style="margin:0 0 6px;font-size:15px;line-height:24px;color:#334155;">${greeting}</p>
      <p style="margin:0 0 22px;font-size:15px;line-height:24px;color:#334155;">Đăng ký vé cho sự kiện <strong style="color:#1e293b;">${eventTitle}</strong> sẽ mở <strong style="color:#f26f21;">${minLabel}</strong>. Hãy sẵn sàng để không bỏ lỡ suất của mình.</p>
      ${infoCard(infoRow('Mở đăng ký lúc', fmtVnDateTime(registrationStart)))}
      ${eventUrl ? ctaButton(eventUrl, 'Mở trang đăng ký') : ''}
      <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#8a7b72;border-top:1px solid #f0e8e2;padding-top:18px;">Số lượng vé có thể giới hạn — vào sớm để chắc suất nhé.</p>
    `,
  });

  return sendMail({ to, subject: `Sắp mở đăng ký (${minLabel}): ${eventTitle}`, html: htmlContent });
};

/** Mail "sắp diễn ra" trước 6 tiếng, kèm gợi ý chuẩn bị theo thời tiết. */
const sendEventStartingSoonEmail = async ({
  to,
  fullname,
  eventTitle,
  eventStart,
  eventEnd,
  location,
  weather,
  weatherAdvice,
  checklist = [],
  eventUrl,
}) => {
  const greeting = fullname ? `Xin chào ${fullname},` : 'Xin chào bạn,';
  const calendarUrl = buildGoogleCalendarUrl({
    title: eventTitle,
    start: eventStart,
    end: eventEnd,
    details: `Sự kiện "${eventTitle}" trên F-Events.\n${eventUrl || ''}`,
    location: location || '',
  });

  const weatherBlock = weather
    ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background:linear-gradient(135deg,#fff4ec,#f7f2ee);border:1px solid #f0d9cb;border-radius:10px;margin:0 0 20px;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 4px;font-size:12px;color:#b06a3f;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Thời tiết Đà Nẵng</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#1e293b;">${weather.temp}°C · ${weather.description || ''}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#64748b;">Cảm giác ${weather.feelsLike}°C · Độ ẩm ${weather.humidity}% · Gió ${weather.windSpeed} m/s</p>
        </td></tr>
      </table>`
    : '';

  const checklistBlock = checklist.length
    ? `
      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1e293b;">Gợi ý nên mang theo</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin:0 0 22px;">
        ${checklist
          .map(
            (item) => `<tr><td style="padding:6px 0;font-size:14px;line-height:20px;color:#334155;vertical-align:top;">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f26f21;margin:0 10px 2px 0;"></span>${item}
            </td></tr>`
          )
          .join('')}
      </table>`
    : '';

  const htmlContent = buildEmailShell({
    title: 'Sự kiện sắp diễn ra — F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#f26f21;font-weight:600;">Sắp diễn ra</p>
      <h1 style="margin:0 0 18px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">${eventTitle}</h1>
      <p style="margin:0 0 6px;font-size:15px;line-height:24px;color:#334155;">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#334155;">Sự kiện bạn quan tâm sẽ bắt đầu trong khoảng <strong>6 tiếng nữa</strong>. Cùng chuẩn bị để có một buổi trọn vẹn nhé.</p>
      ${infoCard(
        infoRow('Bắt đầu', fmtVnDateTime(eventStart)) +
        (location ? infoRow('Địa điểm', location) : '')
      )}
      ${weatherBlock}
      ${weatherAdvice ? `<p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#334155;background:#f8fafc;border-left:3px solid #f26f21;padding:10px 14px;border-radius:4px;">${weatherAdvice}</p>` : ''}
      ${checklistBlock}
      ${ctaButton(calendarUrl, 'Thêm vào Google Calendar')}
      ${eventUrl ? ctaButton(eventUrl, 'Xem chi tiết sự kiện', '#1e293b') : ''}
      <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#8a7b72;border-top:1px solid #f0e8e2;padding-top:18px;">Hẹn gặp bạn tại sự kiện. Chúc bạn có trải nghiệm tuyệt vời cùng F-Events.</p>
    `,
  });

  return sendMail({ to, subject: `Sắp diễn ra: ${eventTitle}`, html: htmlContent });
};

// Email chung cho các thay đổi trạng thái đơn / timeline (đơn cần duyệt, được duyệt,
// bị từ chối, yêu cầu chỉnh sửa...). Dùng lại khung thương hiệu F-Events.
const sendStatusUpdateEmail = async ({ to, title, body, ctaUrl, ctaLabel }) => {
  const htmlContent = buildEmailShell({
    title: `${title} — F-Events`,
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#f26f21;font-weight:600;">Cập nhật trạng thái</p>
      <h1 style="margin:0 0 18px;font-size:21px;font-weight:700;color:#1e293b;line-height:1.35;">${title}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#334155;">${body || ''}</p>
      ${ctaUrl ? ctaButton(ctaUrl, ctaLabel || 'Xem chi tiết') : ''}
      <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#8a7b72;border-top:1px solid #f0e8e2;padding-top:18px;">Bạn nhận được email này vì có liên quan tới đơn/timeline trên F-Events.</p>
    `,
  });
  return sendMail({ to, subject: title, html: htmlContent });
};

const sendEventCheckoutThankYouEmail = async ({ to, fullname, eventTitle, eventId }) => {
  if (!to) return null;
  const eventUrl = eventId ? `${APP_URL}/events/${eventId}` : '';
  const htmlContent = buildEmailShell({
    title: `Cảm ơn bạn đã tham gia: ${eventTitle} — F-Events`,
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#f26f21;font-weight:600;">Cảm ơn bạn đã tham gia</p>
      <h1 style="margin:0 0 18px;font-size:21px;font-weight:700;color:#1e293b;line-height:1.35;">${eventTitle}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#334155;">Chào ${fullname || 'bạn'},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#334155;">Bạn đã check-out khỏi sự kiện <strong>"${eventTitle}"</strong>. Cảm ơn bạn đã dành thời gian tham gia! Ban tổ chức rất mong nhận được đánh giá của bạn để cải thiện những sự kiện sau.</p>
      ${eventUrl ? ctaButton(eventUrl, 'Đánh giá sự kiện') : ''}
      <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#8a7b72;border-top:1px solid #f0e8e2;padding-top:18px;">Hẹn gặp lại bạn ở những sự kiện tiếp theo trên F-Events.</p>
    `,
  });
  return sendMail({ to, subject: `Cảm ơn bạn đã tham gia: ${eventTitle}`, html: htmlContent });
};

const formatVndCurrency = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} ₫`;

// Đối tác gửi yêu cầu Trường tất toán doanh thu → gửi tới Admin.
const sendPartnerSettlementRequestEmail = async ({ to, partnerName, eventTitle, amount, requestNo }) => {
  const htmlContent = buildEmailShell({
    title: 'Yêu cầu tất toán từ đối tác — F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Yêu cầu tất toán${requestNo ? ` · lần ${requestNo}/ngày` : ''}</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Đối tác yêu cầu Trường tất toán doanh thu</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#334155;">Đối tác <strong style="color:#1e293b;">${partnerName || 'Đối tác'}</strong> đề nghị Nhà trường tất toán doanh thu cho sự kiện <strong style="color:#1e293b;">${eventTitle || ''}</strong>.</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:#faf8f6;border:1px solid #e8ddd6;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#8a7b72;padding-bottom:8px;">Doanh thu vé (tạm tính)</td>
              <td align="right" style="font-size:14px;font-weight:700;color:#f26f21;padding-bottom:8px;">${formatVndCurrency(amount)}</td>
            </tr>
          </table>
        </td></tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom:16px;">
        <tr><td align="center">
          <a href="${APP_URL}/admin/partner-settlements" style="display:inline-block;background-color:#f26f21;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Mở trang tất toán</a>
        </td></tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:20px;color:#8a7b72;">Vào mục "Thanh toán sự kiện đối tác" trên trang Admin để xem chi tiết và tất toán.</p>
    `,
  });

  return sendMail({
    to,
    subject: `[F-Events] Yêu cầu tất toán — ${eventTitle || 'Sự kiện đối tác'}`,
    html: htmlContent,
  });
};

// Admin đã tất toán → báo cho đối tác.
const sendPartnerSettlementPaidEmail = async ({ to, partnerName, eventTitle, amount, note, supportEmail }) => {
  const supportTo = supportEmail || process.env.SUPPORT_EMAIL || 'ctsv@fpt.edu.vn';
  const supportSubject = encodeURIComponent(`[Hỗ trợ tất toán] ${eventTitle || 'Sự kiện đối tác'}`);
  const supportBody = encodeURIComponent(
    `Xin chào,\n\nTôi cần hỗ trợ về khoản tất toán cho sự kiện "${eventTitle || ''}" (số tiền ${formatVndCurrency(amount)}).\n\nNội dung cần hỗ trợ:\n`
  );
  const supportMailto = `mailto:${supportTo}?subject=${supportSubject}&body=${supportBody}`;
  const htmlContent = buildEmailShell({
    title: 'Trường đã tất toán doanh thu — F-Events',
    bodyHtml: `
      <p style="margin:0 0 6px;font-size:13px;color:#8a7b72;">Tất toán thành công</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Nhà trường đã tất toán doanh thu</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#334155;">Xin chào ${partnerName || 'Quý đối tác'},</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#334155;">Nhà trường đã tất toán doanh thu cho sự kiện <strong style="color:#1e293b;">${eventTitle || ''}</strong>.</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:#faf8f6;border:1px solid #e8ddd6;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#8a7b72;padding-bottom:8px;">Số tiền tất toán</td>
              <td align="right" style="font-size:14px;font-weight:700;color:#f26f21;padding-bottom:8px;">${formatVndCurrency(amount)}</td>
            </tr>
            ${note ? `<tr>
              <td style="font-size:13px;color:#8a7b72;">Ghi chú</td>
              <td align="right" style="font-size:13px;color:#334155;">${note}</td>
            </tr>` : ''}
          </table>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;font-size:13px;line-height:20px;color:#8a7b72;">Vui lòng kiểm tra tài khoản ngân hàng đã đăng ký trong hồ sơ đối tác. Nếu chưa nhận được tiền hoặc có sai sót, hãy yêu cầu hỗ trợ.</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
        <tr>
          <td align="center">
            <a href="${supportMailto}" style="display:inline-block;background-color:#ffffff;color:#f26f21;text-decoration:none;font-size:14px;font-weight:600;padding:11px 26px;border:1px solid #f26f21;border-radius:8px;">Yêu cầu hỗ trợ</a>
          </td>
        </tr>
      </table>
    `,
  });

  return sendMail({
    to,
    subject: `[F-Events] Đã tất toán doanh thu — ${eventTitle || 'Sự kiện đối tác'}`,
    html: htmlContent,
  });
};

module.exports = {
  sendOtpEmail,
  sendStatusUpdateEmail,
  sendEventCheckoutThankYouEmail,
  sendReminderSignupEmail,
  sendRegistrationOpeningSoonEmail,
  sendEventStartingSoonEmail,
  sendResetEmail,
  sendLoginLockAlertEmail,
  sendActivationEmail,
  sendMailInBackground,
  sendMail,
  sendTestEmail,
  verifySmtpConnection,
  sendPartnerTerminationEmail,
  sendPartnerAdminNoticeEmail,
  sendPartnerCtsvReportEmail,
  sendPaymentConfirmationEmail,
  sendPartnerSettlementRequestEmail,
  sendPartnerSettlementPaidEmail,
};
