const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const {
  pendingUsers,
  OTP_TTL_MS,
  generateOtp,
  isExpired,
} = require('../utils/otpStore');
const { sendOtpEmail } = require('./email.service');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  GOOGLE_CALENDAR_CALLBACK_URL,
  CLIENT_ORIGIN,
} = require('../config/env');
const { verifyToken } = require('../utils/jwt');

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

const createUserFromGoogle = async ({ email, name, picture, googleId, googleCalendarRefreshToken }) => {
  const { role, studentId, course } = await User.detectRole(email);

  return User.create({
    fullname: name,
    email: email.toLowerCase(),
    passwordHash: null,
    googleId: googleId || null,
    googleCalendarRefreshToken: googleCalendarRefreshToken || null,
    authProvider: 'google',
    role,
    studentId,
    course: course || 'K18',
    campus: 'FPT University Da Nang',
    orientation: '',
    interests: [],
    picture: picture || '',
  });
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Vui lòng điền đầy đủ email và mật khẩu!', 400);
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    throw new AppError('Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại!', 401);
  }

  if (user.isActive === false) {
    throw new AppError('Tài khoản chưa được kích hoạt. Vui lòng liên hệ quản trị viên!', 403);
  }

  if (!user.passwordHash) {
    throw new AppError('Tài khoản này sử dụng đăng nhập Google. Vui lòng đăng nhập bằng Google!', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    throw new AppError('Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại!', 401);
  }

  await User.syncAndPersistUserProfile(user);

  return {
    message: 'Đăng nhập thành công!',
    user: sanitizeUser(user),
    token: signToken(user),
  };
};

const signup = async ({ fullname, email, phone, password }) => {
  if (!fullname?.trim()) throw new AppError('Họ và tên không được để trống!', 400);
  if (!email) throw new AppError('Email không được để trống!', 400);
  if (!phone) throw new AppError('Số điện thoại không được để trống!', 400);
  if (!password) throw new AppError('Mật khẩu không được để trống!', 400);

  const emailKey = email.trim().toLowerCase();

  if (await User.findOne({ email: emailKey })) {
    throw new AppError('Email đã được đăng ký trên hệ thống!', 400);
  }

  if (phone.trim() && await User.findOne({ phone: phone.trim() })) {
    throw new AppError('Số điện thoại đã được đăng ký trên hệ thống!', 400);
  }

  const otpCode = generateOtp();
  const hashedPassword = await bcrypt.hash(password, 10);

  pendingUsers.set(emailKey, {
    fullname: fullname.trim(),
    email: email.trim(),
    phone: phone.trim(),
    passwordHash: hashedPassword,
    otp: otpCode,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  await sendOtpEmail(email.trim(), fullname.trim(), otpCode);

  return {
    status: 'OTP_SENT',
    message: 'Mã xác minh OTP đã được gửi đến email của bạn!',
  };
};

const verifyOtp = async ({ email, otp }) => {
  if (!email || !otp) {
    throw new AppError('Thiếu email hoặc mã xác minh OTP!', 400);
  }

  const emailKey = email.trim().toLowerCase();
  const pendingUser = pendingUsers.get(emailKey);

  if (!pendingUser) {
    throw new AppError('Không tìm thấy yêu cầu đăng ký hoặc mã OTP đã hết hạn!', 400);
  }

  if (isExpired(pendingUser)) {
    pendingUsers.delete(emailKey);
    throw new AppError('Mã OTP đã hết hạn! Vui lòng đăng ký lại.', 400);
  }

  if (pendingUser.otp !== otp.trim()) {
    throw new AppError('Mã xác minh OTP không chính xác. Vui lòng kiểm tra lại!', 400);
  }

  if (await User.findOne({ email: emailKey })) {
    pendingUsers.delete(emailKey);
    throw new AppError('Tài khoản này đã được đăng ký trước đó!', 400);
  }

  const { role, studentId, course } = await User.detectRole(pendingUser.email);

  const newUser = await User.create({
    fullname: pendingUser.fullname,
    email: emailKey,
    phone: pendingUser.phone,
    passwordHash: pendingUser.passwordHash,
    authProvider: 'local',
    role,
    studentId,
    course: course || 'K18',
    campus: 'FPT University Da Nang',
    orientation: '',
    interests: [],
  });

  pendingUsers.delete(emailKey);

  return {
    message: 'Đăng ký tài khoản thành công!',
    user: sanitizeUser(newUser),
    token: signToken(newUser),
  };
};

const resendOtp = async ({ email }) => {
  if (!email) throw new AppError('Thiếu thông tin email!', 400);

  const emailKey = email.trim().toLowerCase();
  const pendingUser = pendingUsers.get(emailKey);

  if (!pendingUser) {
    throw new AppError('Không tìm thấy yêu cầu đăng ký tương ứng cho email này!', 400);
  }

  const newOtpCode = generateOtp();
  pendingUser.otp = newOtpCode;
  pendingUser.expiresAt = Date.now() + OTP_TTL_MS;
  pendingUsers.set(emailKey, pendingUser);

  await sendOtpEmail(pendingUser.email, pendingUser.fullname, newOtpCode);

  return { message: 'Mã OTP mới đã được gửi lại vào email của bạn!' };
};

const googleLogin = async ({ token, email, name, isMock, picture }) => {
  let googleEmail = '';
  let googleName = '';
  let googlePicture = '';
  let googleId = '';

  if (GOOGLE_CLIENT_ID !== 'mock' && !isMock) {
    if (!token) throw new AppError('Thiếu mã token Google!', 400);

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    googleEmail = payload.email;
    googleName = payload.name || payload.given_name || 'Người dùng Google';
    googlePicture = payload.picture || '';
    googleId = payload.sub || '';
  } else {
    if (!email || !name) {
      throw new AppError('Thiếu email hoặc tên cho đăng nhập Google!', 400);
    }
    googleEmail = email.trim().toLowerCase();
    googleName = name.trim();
    googlePicture = picture || '';
    googleId = `mock-${googleEmail}`;
  }

  if (!googleEmail) {
    throw new AppError('Không thể xác thực email từ Google!', 400);
  }

  let user = await User.findOne({ email: googleEmail.toLowerCase() });

  if (user) {
    await User.syncAndPersistUserProfile(user, buildGoogleLoginUpdate(user, {
      googleId,
      googlePicture,
    }));
    user = await User.findOne({ email: googleEmail.toLowerCase() });

    return {
      message: 'Đăng nhập bằng Google thành công!',
      user: sanitizeUser(user),
      token: signToken(user),
    };
  }

  const newUser = await createUserFromGoogle({
    email: googleEmail,
    name: googleName,
    picture: googlePicture,
    googleId,
  });

  return {
    message: 'Tự động tạo tài khoản và đăng nhập thành công!',
    user: sanitizeUser(newUser),
    token: signToken(newUser),
    isNewUser: true,
  };
};

const googleCallback = async (code) => {
  if (!code) {
    throw new AppError('Không nhận được mã code từ Google.', 400);
  }

  let email = '';
  let name = '';
  let picture = '';
  let googleId = '';

  if (!GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET === 'mock') {
    console.log('[MOCK CALLBACK] Client Secret is not set. Simulating login...');
    email = 'kxnhan1507@gmail.com';
    name = 'Nhân Khưu Xuân';
    picture = '';
    googleId = 'mock-kxnhan1507';
  } else {
    const oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_CALLBACK_URL
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
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
    user = await createUserFromGoogle({
      email,
      name,
      picture,
      googleId,
    });
  }

  const authToken = signToken(user);
  let redirectUrl = `${CLIENT_ORIGIN}/login?auth_status=success&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&token=${encodeURIComponent(authToken)}`;

  const userWithCalendar = await User.findOne({ email: email.toLowerCase() })
    .select('+googleCalendarRefreshToken');
  const canLinkCalendar = GOOGLE_CLIENT_SECRET && GOOGLE_CLIENT_SECRET !== 'mock';
  if (canLinkCalendar && !userWithCalendar?.googleCalendarRefreshToken) {
    redirectUrl += '&needs_calendar=1';
  }

  return { redirectUrl };
};

const getGoogleCalendarAuthUrl = (authToken) => {
  if (!authToken) {
    throw new AppError('Thiếu token xác thực.', 401);
  }

  let email = '';
  try {
    const payload = verifyToken(authToken);
    email = payload.email;
  } catch {
    throw new AppError('Token không hợp lệ.', 401);
  }

  if (!GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET === 'mock') {
    throw new AppError('Google Calendar chưa được cấu hình.', 503);
  }

  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALENDAR_CALLBACK_URL
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: encodeURIComponent(email),
  });

  return { url };
};

const googleCalendarCallback = async (code, state) => {
  if (!code) {
    throw new AppError('Không nhận được mã code từ Google.', 400);
  }

  const email = decodeURIComponent(state || '').trim().toLowerCase();
  if (!email) {
    throw new AppError('Phiên liên kết Calendar không hợp lệ.', 400);
  }

  if (!GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET === 'mock') {
    return { redirectUrl: `${CLIENT_ORIGIN}/?calendar_status=mock` };
  }

  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALENDAR_CALLBACK_URL
  );
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new AppError('Google không cấp refresh token. Hãy thu hồi quyền app trong tài khoản Google và thử lại.', 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('Không tìm thấy tài khoản.', 404);
  }

  await User.syncAndPersistUserProfile(user, {
    googleCalendarRefreshToken: tokens.refresh_token,
  });

  return { redirectUrl: `${CLIENT_ORIGIN}/?calendar_status=linked` };
};

module.exports = {
  login,
  signup,
  verifyOtp,
  resendOtp,
  googleLogin,
  googleCallback,
  getGoogleCalendarAuthUrl,
  googleCalendarCallback,
};
