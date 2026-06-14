const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const {
  pendingUsers,
  pendingResets,
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  OTP_SIGNUP_LOCK_MS,
  generateOtp,
  isExpired,
  createPendingResetEntry,
  createPendingSignupEntry,
  recordFailedOtpAttempt,
  getRemainingOtpAttempts,
  isEntryOtpLocked,
  getLockRemainingSeconds,
  throwOtpLockedError,
} = require('../utils/otpStore');
const { validatePasswordPolicy } = require('../utils/passwordPolicy');
const { sendOtpEmail, sendResetEmail } = require('./email.service');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  GOOGLE_CALENDAR_CALLBACK_URL,
  CLIENT_ORIGIN,
  MOCK_GOOGLE_EMAIL,
  MOCK_GOOGLE_NAME,
} = require('../config/env');
const { verifyToken } = require('../utils/jwt');
const { assertLoginAllowed: assertSystemLoginAllowed } = require('./systemSettings.service');
const {
  assertLoginAllowed: assertPasswordLockoutAllowed,
  recordFailedLogin,
  throwAfterFailedLogin,
  clearLoginLockout,
  verifyPasswordWithTiming,
  unlockAccount,
} = require('./loginLockout.service');

const sanitizeUser = (user) => User.sanitizeUser(user);

const EMAIL_CONTACT_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_CONTACT_PATTERN = /^0[35789]\d{8}$/;

const normalizeForgotContact = (contact) => {
  const trimmed = String(contact || '').trim();
  if (!trimmed) return null;
  if (EMAIL_CONTACT_PATTERN.test(trimmed)) return trimmed.toLowerCase();
  if (PHONE_CONTACT_PATTERN.test(trimmed)) return trimmed;
  return null;
};

const throwGoogleAccountError = (message, statusCode = 403) => {
  const err = new AppError(message, statusCode);
  err.extra = { code: 'GOOGLE_ACCOUNT' };
  throw err;
};

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

  const emailKey = email.trim().toLowerCase();
  await assertPasswordLockoutAllowed(emailKey);

  const user = await User.findOne({ email: emailKey });

  if (user && !user.passwordHash) {
    throw new AppError('Tài khoản này sử dụng đăng nhập Google. Vui lòng đăng nhập bằng Google!', 401);
  }

  const isMatch = await verifyPasswordWithTiming(password, user?.passwordHash);

  if (!isMatch) {
    const record = await recordFailedLogin(emailKey, user || null);
    await throwAfterFailedLogin(record);
  }

  await clearLoginLockout(emailKey);
  await User.syncAndPersistUserProfile(user);
  await assertSystemLoginAllowed(user);

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
  const existingUser = await User.findOne({ email: emailKey });

  if (existingUser) {
    if (User.isGoogleOnlyAccount(existingUser)) {
      throwGoogleAccountError(
        'Email này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google!',
        409
      );
    }
    throw new AppError('Email đã được đăng ký trên hệ thống!', 400);
  }

  if (phone.trim()) {
    const phoneUser = await User.findOne({ phone: phone.trim() });
    if (phoneUser) {
      if (User.isGoogleOnlyAccount(phoneUser)) {
        throwGoogleAccountError(
          'Số điện thoại này thuộc tài khoản Google. Vui lòng đăng nhập bằng Google!',
          409
        );
      }
      throw new AppError('Số điện thoại đã được đăng ký trên hệ thống!', 400);
    }
  }

  const otpCode = generateOtp();
  const hashedPassword = await bcrypt.hash(password, 10);

  pendingUsers.set(emailKey, createPendingSignupEntry({
    fullname: fullname.trim(),
    email: email.trim(),
    phone: phone.trim(),
    passwordHash: hashedPassword,
    otp: otpCode,
    expiresAt: Date.now() + OTP_TTL_MS,
  }));

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

  if (isEntryOtpLocked(pendingUser)) {
    pendingUsers.set(emailKey, pendingUser);
    throwOtpLockedError(pendingUser, 'signup');
  }

  if (pendingUser.otp !== otp.trim()) {
    recordFailedOtpAttempt(pendingUser, { lockDurationMs: OTP_SIGNUP_LOCK_MS });
    pendingUsers.set(emailKey, pendingUser);

    if (isEntryOtpLocked(pendingUser)) {
      throwOtpLockedError(pendingUser, 'signup');
    }

    const remaining = getRemainingOtpAttempts(pendingUser);
    const err = new AppError(
      `Mã xác minh OTP không chính xác. Bạn còn ${remaining} lần thử.`,
      400
    );
    err.extra = { code: 'OTP_INVALID', remainingAttempts: remaining };
    throw err;
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

  if (isEntryOtpLocked(pendingUser)) {
    throwOtpLockedError(pendingUser, 'signup');
  }

  const newOtpCode = generateOtp();
  pendingUser.otp = newOtpCode;
  pendingUser.expiresAt = Date.now() + OTP_TTL_MS;
  pendingUsers.set(emailKey, pendingUser);

  await sendOtpEmail(pendingUser.email, pendingUser.fullname, newOtpCode);

  return { message: 'Mã OTP mới đã được gửi lại vào email của bạn!' };
};

const forgotPassword = async ({ contact }) => {
  if (!contact) throw new AppError('Vui lòng điền email hoặc số điện thoại.', 400);

  const contactVal = normalizeForgotContact(contact);
  if (!contactVal) {
    throw new AppError('Email hoặc số điện thoại không hợp lệ.', 400);
  }

  const user = await User.findOne({
    $or: [{ email: contactVal }, { phone: contactVal }],
  });

  if (!user) {
    throw new AppError('Email hoặc số điện thoại không tồn tại trên hệ thống.', 404);
  }

  if (User.isGoogleOnlyAccount(user)) {
    throwGoogleAccountError(
      'Tài khoản này đăng nhập bằng Google, không thể đặt lại mật khẩu. Vui lòng đăng nhập bằng Google.'
    );
  }

  const otpCode = generateOtp();
  const emailKey = user.email.toLowerCase();

  pendingResets.set(emailKey, createPendingResetEntry({
    email: user.email,
    otp: otpCode,
    expiresAt: Date.now() + OTP_TTL_MS,
  }));

  try {
    await sendResetEmail(user.email, user.fullname, otpCode);
  } catch (err) {
    pendingResets.delete(emailKey);
    console.error('Lỗi gửi email khôi phục mật khẩu:', err.message);
    throw new AppError('Không thể gửi email khôi phục. Vui lòng thử lại sau.', 500);
  }

  return {
    message: 'Liên kết khôi phục đã được gửi. Kiểm tra hộp thư của bạn.',
    isPhone: PHONE_CONTACT_PATTERN.test(contactVal),
    email: user.email,
  };
};

const resetPassword = async ({ email, otp, newPassword }) => {
  if (!email || !otp || !newPassword) {
    throw new AppError('Vui lòng điền đầy đủ các thông tin bắt buộc.', 400);
  }

  const passwordCheck = validatePasswordPolicy(newPassword);
  if (!passwordCheck.valid) {
    throw new AppError(passwordCheck.message, 400);
  }

  const emailKey = email.trim().toLowerCase();
  if (!EMAIL_CONTACT_PATTERN.test(emailKey)) {
    throw new AppError('Email không hợp lệ.', 400);
  }

  const pendingReset = pendingResets.get(emailKey);

  if (!pendingReset) {
    throw new AppError('Không tìm thấy yêu cầu đặt lại mật khẩu hoặc mã OTP đã hết hạn.', 400);
  }

  if (pendingReset.locked) {
    pendingResets.delete(emailKey);
    throwOtpLockedError(pendingReset, 'reset');
  }

  if (isExpired(pendingReset)) {
    pendingResets.delete(emailKey);
    throw new AppError('Mã OTP đã hết hạn. Vui lòng thực hiện lại từ trang Quên mật khẩu.', 400);
  }

  if (pendingReset.otp !== String(otp).trim()) {
    recordFailedOtpAttempt(pendingReset);

    if (pendingReset.locked) {
      pendingResets.delete(emailKey);
      throwOtpLockedError(pendingReset, 'reset');
    }

    pendingResets.set(emailKey, pendingReset);
    const remaining = getRemainingOtpAttempts(pendingReset);
    const err = new AppError(
      `Mã xác minh OTP không chính xác. Bạn còn ${remaining} lần thử.`,
      400
    );
    err.extra = { code: 'OTP_INVALID', remainingAttempts: remaining };
    throw err;
  }

  const user = await User.findOne({ email: emailKey });

  if (!user) {
    pendingResets.delete(emailKey);
    throw new AppError('Không tìm thấy người dùng trên hệ thống.', 404);
  }

  if (User.isGoogleOnlyAccount(user)) {
    pendingResets.delete(emailKey);
    throwGoogleAccountError(
      'Tài khoản này đăng nhập bằng Google, không thể đặt lại mật khẩu. Vui lòng đăng nhập bằng Google.'
    );
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  if (!user.authProvider || user.authProvider === 'google') {
    user.authProvider = 'local';
  }
  await user.save();
  pendingResets.delete(emailKey);
  await clearLoginLockout(emailKey);

  return { message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' };
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
    await assertSystemLoginAllowed(user);

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
  await assertSystemLoginAllowed(newUser);

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
    email = MOCK_GOOGLE_EMAIL;
    name = MOCK_GOOGLE_NAME;
    picture = '';
    googleId = `mock-${email.split('@')[0]}`;
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
  const redirectUrl = `${CLIENT_ORIGIN}/auth/google/callback?auth_status=success&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&token=${encodeURIComponent(authToken)}`;

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
  forgotPassword,
  resetPassword,
  googleLogin,
  googleCallback,
  getGoogleCalendarAuthUrl,
  googleCalendarCallback,
  unlockAccount,
};
