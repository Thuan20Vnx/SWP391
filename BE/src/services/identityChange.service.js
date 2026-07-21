/**
 * Đổi email đăng nhập và tên đăng nhập của chính người dùng.
 *
 * Mô hình bảo mật (nhiều lớp, vì đây là thao tác chiếm được tài khoản nếu bị lạm dụng):
 *  1. Xác thực lại bằng mật khẩu hiện tại — phiên bị chiếm không đủ để đổi định danh.
 *  2. OTP: đổi email cần HAI mã (hòm thư cũ chứng minh đang sở hữu tài khoản,
 *     hòm thư mới chứng minh sở hữu địa chỉ mới); đổi tên đăng nhập cần một mã.
 *  3. Chặn khi tài khoản đang bị khóa đăng nhập — nếu không, đổi email sẽ thành
 *     cách né khóa (LoginLockout lưu theo email).
 *  4. Giới hạn số lần nhập sai, khóa tạm 15 phút.
 *  5. Sau khi đổi email: gửi cảnh báo về hòm thư CŨ và cấp lại token.
 */

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const LoginLockout = require('../models/LoginLockout');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const { validateUsername, isUsernameTaken, normalizeUsername } = require('../utils/username');
const { sendIdentityChangeOtpEmail, sendEmailChangedNoticeEmail } = require('./email.service');
const { findEmailConflicts, migrateUserEmail } = require('./emailMigration.service');
const store = require('../utils/identityChangeStore');

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const sanitizeUser = (user) => User.sanitizeUser(user);

const loadUser = async (authEmail) => {
  const user = await User.findOne({ email: String(authEmail || '').trim().toLowerCase() });
  if (!user) throw new AppError('Không tìm thấy thông tin người dùng!', 404);
  return user;
};

/**
 * Xác thực lại bằng mật khẩu. Tài khoản Google không có mật khẩu nên không đi
 * qua được bước này — đó là lý do chúng bị chặn đổi email (xem assertCanChangeEmail).
 */
const assertPassword = async (user, currentPassword) => {
  if (!user.passwordHash) {
    throw new AppError(
      'Tài khoản đăng nhập bằng Google không có mật khẩu để xác minh. Vui lòng liên hệ Phòng Công tác Sinh viên.',
      400,
    );
  }
  if (!currentPassword) throw new AppError('Vui lòng nhập mật khẩu hiện tại!', 400);

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new AppError('Mật khẩu hiện tại không chính xác!', 400);
};

/** Đang bị khóa đăng nhập thì không cho đổi định danh (tránh né khóa). */
const assertNotLockedOut = async (email) => {
  const record = await LoginLockout.findOne({ email });
  if (!record) return;

  const tempLocked = record.lockedUntil && new Date(record.lockedUntil) > new Date();
  if (record.emailLocked || tempLocked) {
    throw new AppError(
      'Tài khoản đang bị khóa đăng nhập. Vui lòng mở khóa trước khi đổi email hoặc tên đăng nhập.',
      403,
    );
  }
};

const assertCanChangeEmail = (user) => {
  if (user.authProvider === 'google' || user.googleId) {
    throw new AppError(
      'Tài khoản đăng nhập bằng Google không thể đổi email tại đây, vì email chính là định danh Google của bạn.',
      400,
    );
  }
};

// ---------------------------------------------------------------------------
// Đổi email đăng nhập
// ---------------------------------------------------------------------------

const requestEmailChange = async (authEmail, { newEmail, currentPassword } = {}) => {
  const user = await loadUser(authEmail);
  assertCanChangeEmail(user);
  await assertNotLockedOut(user.email);
  await assertPassword(user, currentPassword);

  const nextEmail = String(newEmail || '').trim().toLowerCase();
  if (!nextEmail) throw new AppError('Vui lòng nhập email mới!', 400);
  if (!EMAIL_PATTERN.test(nextEmail)) throw new AppError('Email mới không hợp lệ!', 400);
  if (nextEmail === user.email) {
    throw new AppError('Email mới phải khác email hiện tại!', 400);
  }

  if (await User.exists({ email: nextEmail })) {
    throw new AppError('Email này đã được sử dụng cho tài khoản khác!', 400);
  }

  // Email mới có thể chưa có tài khoản nhưng đã xuất hiện ở dữ liệu khác
  // (hồ sơ đối tác, nhắc sự kiện...). Những nơi đó có ràng buộc duy nhất nên
  // phải chặn từ đây, không để việc di chuyển hỏng giữa chừng.
  const conflicts = await findEmailConflicts(nextEmail);
  if (conflicts.length) {
    throw new AppError(
      `Email này đang gắn với dữ liệu sẵn có (${conflicts.map((c) => c.label).join(', ')}). Vui lòng dùng địa chỉ khác hoặc liên hệ Phòng Công tác Sinh viên.`,
      400,
    );
  }

  const otpCurrent = store.generateSecureOtp();
  const otpNew = store.generateSecureOtp();

  store.setEntry(user._id, store.createEntry({
    type: 'email',
    newEmail: nextEmail,
    otpCurrent,
    otpNew,
  }));

  // Gửi song song; nếu một trong hai hỏng thì hủy yêu cầu để người dùng không
  // rơi vào trạng thái không bao giờ xác minh đủ hai mã.
  try {
    await Promise.all([
      sendIdentityChangeOtpEmail(user.email, user.fullname, otpCurrent, 'email_current', { newEmail: nextEmail }),
      sendIdentityChangeOtpEmail(nextEmail, user.fullname, otpNew, 'email_new'),
    ]);
  } catch (err) {
    store.clearEntry(user._id);
    console.error('[IdentityChange] Gửi OTP đổi email thất bại:', err.message);
    throw new AppError('Không gửi được mã xác minh. Vui lòng thử lại sau.', 503);
  }

  return {
    message: 'Đã gửi mã xác minh tới cả email hiện tại và email mới.',
    newEmail: nextEmail,
    expiresInMinutes: store.OTP_TTL_MS / 60000,
  };
};

const confirmEmailChange = async (authEmail, { otpCurrent, otpNew } = {}) => {
  const user = await loadUser(authEmail);
  const entry = store.getEntry(user._id);

  if (!entry || entry.type !== 'email') {
    throw new AppError('Không tìm thấy yêu cầu đổi email hoặc mã đã hết hạn. Vui lòng thực hiện lại.', 400);
  }
  if (store.isLocked(entry)) store.throwLockedError(entry);

  const okCurrent = store.safeCompareOtp(otpCurrent, entry.otpCurrent);
  const okNew = store.safeCompareOtp(otpNew, entry.otpNew);

  if (!okCurrent || !okNew) {
    store.recordFailedAttempt(entry);
    if (store.isLocked(entry)) store.throwLockedError(entry);

    const remaining = store.getRemainingAttempts(entry);
    let which = 'Mã xác minh không chính xác.';
    if (okCurrent && !okNew) which = 'Mã gửi tới email mới không chính xác.';
    if (!okCurrent && okNew) which = 'Mã gửi tới email hiện tại không chính xác.';

    const err = new AppError(`${which} Bạn còn ${remaining} lần thử.`, 400);
    err.extra = { code: 'OTP_INVALID', remainingAttempts: remaining };
    throw err;
  }

  const oldEmail = user.email;
  const nextEmail = entry.newEmail;

  // Kiểm tra lại ngay trước khi ghi: từ lúc gửi OTP tới giờ có thể đã có người
  // khác chiếm mất địa chỉ này.
  if (await User.exists({ email: nextEmail })) {
    store.clearEntry(user._id);
    throw new AppError('Email này vừa được sử dụng cho tài khoản khác. Vui lòng thử lại với địa chỉ khác.', 400);
  }

  const summary = await applyEmailChange(user, oldEmail, nextEmail);
  store.clearEntry(user._id);

  // Cảnh báo về hòm thư cũ — chủ tài khoản phải biết nếu đây không phải việc mình làm.
  sendEmailChangedNoticeEmail({ to: oldEmail, fullname: user.fullname, newEmail: nextEmail })
    .catch((err) => console.error('[IdentityChange] Gửi cảnh báo về email cũ thất bại:', err.message));

  const fresh = await User.findById(user._id);

  return {
    message: 'Đã đổi email đăng nhập thành công.',
    user: sanitizeUser(fresh),
    // Token cũ mang email cũ nên sẽ trỏ tới tài khoản không tồn tại — phải cấp lại.
    token: signToken(fresh),
    migrated: summary,
  };
};

/**
 * Ghi thay đổi email lên User và toàn bộ dữ liệu liên quan.
 * Dùng transaction nếu MongoDB hỗ trợ (Atlas replica set); nếu không thì chạy
 * tuần tự và ghi log để còn lần ra khi có sự cố.
 */
/** MongoDB standalone (dev cục bộ) không hỗ trợ transaction — Atlas replica set thì có. */
const isTransactionUnsupported = (err) => {
  const msg = String(err?.message || '');
  return (
    err?.code === 20
    || err?.codeName === 'IllegalOperation'
    || /Transaction numbers are only allowed/i.test(msg)
    || /transactions are not supported/i.test(msg)
    || /replica set/i.test(msg)
  );
};

const writeEmailChange = async (user, oldEmail, newEmail, session) => {
  const summary = await migrateUserEmail(oldEmail, newEmail, { session });
  await User.updateOne(
    { _id: user._id },
    { $set: { email: newEmail } },
    session ? { session } : {},
  );
  return summary;
};

const applyEmailChange = async (user, oldEmail, newEmail) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    session = null;
  }

  if (session) {
    try {
      const summary = await writeEmailChange(user, oldEmail, newEmail, session);
      await session.commitTransaction();
      console.log(
        `[IdentityChange] ${oldEmail} -> ${newEmail}: cập nhật ${summary.total} bản ghi (có transaction)`,
        JSON.stringify(summary.details),
      );
      return summary;
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      // Transaction đã hủy nên chưa có gì được ghi — chạy lại tuần tự là an toàn.
      if (!isTransactionUnsupported(err)) {
        console.error(`[IdentityChange] Đã hoàn tác việc đổi ${oldEmail} -> ${newEmail}:`, err.message);
        throw new AppError('Không thể hoàn tất đổi email. Dữ liệu của bạn được giữ nguyên.', 500);
      }
      console.warn('[IdentityChange] MongoDB không hỗ trợ transaction, chuyển sang ghi tuần tự.');
    } finally {
      await session.endSession().catch(() => {});
    }
  }

  // Không có transaction: ghi tuần tự. Nếu hỏng giữa chừng thì không tự hoàn tác
  // được, nên log thật rõ để còn khôi phục thủ công.
  try {
    const summary = await writeEmailChange(user, oldEmail, newEmail, null);
    console.log(
      `[IdentityChange] ${oldEmail} -> ${newEmail}: cập nhật ${summary.total} bản ghi (không transaction)`,
      JSON.stringify(summary.details),
    );
    return summary;
  } catch (err) {
    console.error(
      `[IdentityChange] LỖI GIỮA CHỪNG khi đổi ${oldEmail} -> ${newEmail} và KHÔNG có transaction để hoàn tác. `
      + `Cần kiểm tra thủ công dữ liệu của hai địa chỉ này. Chi tiết:`,
      err.message,
    );
    throw new AppError('Không thể hoàn tất đổi email. Vui lòng liên hệ quản trị viên để kiểm tra dữ liệu.', 500);
  }
};

// ---------------------------------------------------------------------------
// Đổi tên đăng nhập
// ---------------------------------------------------------------------------

const requestUsernameChange = async (authEmail, { newUsername, currentPassword } = {}) => {
  const user = await loadUser(authEmail);
  await assertNotLockedOut(user.email);

  // Tài khoản Google không có mật khẩu để xác thực lại, nhưng vẫn nhận được OTP
  // qua hòm thư. Đổi tên đăng nhập không ảnh hưởng dữ liệu nên OTP là đủ.
  if (user.passwordHash) await assertPassword(user, currentPassword);

  const check = validateUsername(newUsername);
  if (!check.valid) throw new AppError(check.message, 400);

  if (check.username === normalizeUsername(user.username)) {
    throw new AppError('Tên đăng nhập mới phải khác tên hiện tại!', 400);
  }
  if (await isUsernameTaken(check.username, user._id)) {
    throw new AppError('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác!', 400);
  }

  if (user.usernameChangedAt) {
    const elapsed = Date.now() - new Date(user.usernameChangedAt).getTime();
    if (elapsed < store.USERNAME_CHANGE_COOLDOWN_MS) {
      const days = Math.ceil((store.USERNAME_CHANGE_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
      throw new AppError(`Bạn chỉ có thể đổi tên đăng nhập sau mỗi 30 ngày. Vui lòng thử lại sau ${days} ngày.`, 429);
    }
  }

  const otp = store.generateSecureOtp();
  store.setEntry(user._id, store.createEntry({
    type: 'username',
    newUsername: check.username,
    otpCurrent: otp,
  }));

  try {
    await sendIdentityChangeOtpEmail(user.email, user.fullname, otp, 'username', {
      newUsername: check.username,
    });
  } catch (err) {
    store.clearEntry(user._id);
    console.error('[IdentityChange] Gửi OTP đổi tên đăng nhập thất bại:', err.message);
    throw new AppError('Không gửi được mã xác minh. Vui lòng thử lại sau.', 503);
  }

  return {
    message: 'Đã gửi mã xác minh tới email của bạn.',
    newUsername: check.username,
    expiresInMinutes: store.OTP_TTL_MS / 60000,
  };
};

const confirmUsernameChange = async (authEmail, { otp } = {}) => {
  const user = await loadUser(authEmail);
  const entry = store.getEntry(user._id);

  if (!entry || entry.type !== 'username') {
    throw new AppError('Không tìm thấy yêu cầu đổi tên đăng nhập hoặc mã đã hết hạn. Vui lòng thực hiện lại.', 400);
  }
  if (store.isLocked(entry)) store.throwLockedError(entry);

  if (!store.safeCompareOtp(otp, entry.otpCurrent)) {
    store.recordFailedAttempt(entry);
    if (store.isLocked(entry)) store.throwLockedError(entry);

    const remaining = store.getRemainingAttempts(entry);
    const err = new AppError(`Mã xác minh không chính xác. Bạn còn ${remaining} lần thử.`, 400);
    err.extra = { code: 'OTP_INVALID', remainingAttempts: remaining };
    throw err;
  }

  if (await isUsernameTaken(entry.newUsername, user._id)) {
    store.clearEntry(user._id);
    throw new AppError('Tên đăng nhập vừa được người khác sử dụng. Vui lòng chọn tên khác.', 400);
  }

  user.username = entry.newUsername;
  user.usernameChangedAt = new Date();
  await user.save();
  store.clearEntry(user._id);

  return {
    message: 'Đã đổi tên đăng nhập thành công.',
    user: sanitizeUser(user),
  };
};

// ---------------------------------------------------------------------------
// Tạo mật khẩu đầu tiên cho tài khoản Google (kèm tên đăng nhập nếu chưa có)
// ---------------------------------------------------------------------------

/**
 * Bước 1: nhận mật khẩu mong muốn, gửi OTP về hòm thư của tài khoản.
 *
 * Vì sao cần OTP: đặt mật khẩu lần đầu biến một phiên đăng nhập tạm thời thành lối
 * vào lâu dài. Chỉ dựa vào token thì ai mượn được máy đang mở sẵn cũng đặt được mật
 * khẩu rồi đăng nhập lại bất cứ lúc nào. OTP buộc phải kiểm soát cả hòm thư.
 *
 * Tài khoản Google thường chưa có tên đăng nhập, nên cho đặt luôn trong cùng bước
 * để không phải đi qua luồng đổi tên (vốn đòi mật khẩu hiện tại) ngay sau đó.
 */
const requestPasswordSetup = async (authEmail, { newPassword, newUsername } = {}) => {
  const user = await loadUser(authEmail);
  await assertNotLockedOut(user.email);

  if (user.passwordHash) {
    throw new AppError('Tài khoản đã có mật khẩu. Vui lòng dùng chức năng đổi mật khẩu.', 400);
  }

  if (!newPassword || String(newPassword).length < 6) {
    throw new AppError('Mật khẩu phải có ít nhất 6 ký tự!', 400);
  }

  // Tên đăng nhập là tùy chọn: người dùng vẫn đăng nhập được bằng email.
  let username = '';
  if (newUsername) {
    if (user.username) {
      throw new AppError('Tài khoản đã có tên đăng nhập. Vui lòng dùng chức năng đổi tên đăng nhập.', 400);
    }
    const check = validateUsername(newUsername);
    if (!check.valid) throw new AppError(check.message, 400);
    if (await isUsernameTaken(check.username, user._id)) {
      throw new AppError('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác!', 400);
    }
    username = check.username;
  }

  const otp = store.generateSecureOtp();
  store.setEntry(user._id, store.createEntry({
    type: 'password_setup',
    newUsername: username,
    otpCurrent: otp,
    passwordHash: await bcrypt.hash(newPassword, 10),
  }));

  try {
    await sendIdentityChangeOtpEmail(user.email, user.fullname, otp, 'password_setup', {
      newUsername: username,
    });
  } catch (err) {
    store.clearEntry(user._id);
    console.error('[IdentityChange] Gửi OTP tạo mật khẩu thất bại:', err.message);
    throw new AppError('Không gửi được mã xác minh. Vui lòng thử lại sau.', 503);
  }

  return {
    message: 'Đã gửi mã xác minh tới email của bạn.',
    newUsername: username,
    expiresInMinutes: store.OTP_TTL_MS / 60000,
  };
};

/** Bước 2: xác minh OTP rồi mới ghi mật khẩu (và tên đăng nhập) vào tài khoản. */
const confirmPasswordSetup = async (authEmail, { otp } = {}) => {
  const user = await loadUser(authEmail);
  const entry = store.getEntry(user._id);

  if (!entry || entry.type !== 'password_setup') {
    throw new AppError('Không tìm thấy yêu cầu tạo mật khẩu hoặc mã đã hết hạn. Vui lòng thực hiện lại.', 400);
  }
  if (store.isLocked(entry)) store.throwLockedError(entry);

  if (!store.safeCompareOtp(otp, entry.otpCurrent)) {
    store.recordFailedAttempt(entry);
    if (store.isLocked(entry)) store.throwLockedError(entry);

    const remaining = store.getRemainingAttempts(entry);
    const err = new AppError(`Mã xác minh không chính xác. Bạn còn ${remaining} lần thử.`, 400);
    err.extra = { code: 'OTP_INVALID', remainingAttempts: remaining };
    throw err;
  }

  // Chặn trường hợp có mật khẩu bằng đường khác trong lúc chờ OTP.
  if (user.passwordHash) {
    store.clearEntry(user._id);
    throw new AppError('Tài khoản đã có mật khẩu. Vui lòng dùng chức năng đổi mật khẩu.', 400);
  }

  if (entry.newUsername) {
    if (await isUsernameTaken(entry.newUsername, user._id)) {
      store.clearEntry(user._id);
      throw new AppError('Tên đăng nhập vừa được người khác sử dụng. Vui lòng chọn tên khác.', 400);
    }
    user.username = entry.newUsername;
    user.usernameChangedAt = new Date();
  }

  user.passwordHash = entry.passwordHash;
  await user.save();
  store.clearEntry(user._id);

  return {
    message: entry.newUsername
      ? 'Đã tạo mật khẩu và tên đăng nhập. Từ giờ bạn có thể đăng nhập bằng cả Google lẫn mật khẩu.'
      : 'Đã tạo mật khẩu. Từ giờ bạn có thể đăng nhập bằng cả Google lẫn mật khẩu.',
    user: sanitizeUser(user),
  };
};

module.exports = {
  requestEmailChange,
  confirmEmailChange,
  requestUsernameChange,
  confirmUsernameChange,
  requestPasswordSetup,
  confirmPasswordSetup,
};
