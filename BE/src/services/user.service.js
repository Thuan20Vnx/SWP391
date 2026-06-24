const bcrypt = require('bcrypt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { normalizeRole } = require('../utils/role');

const sanitizeUser = (user) => User.sanitizeUser(user);

const MAX_IMAGE_DATA_URL_LENGTH = 800 * 1024;

const assertValidImageDataUrl = (value, label) => {
  if (!value || typeof value !== 'string') return;
  if (value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new AppError(
      `${label} quá lớn. Vui lòng chọn ảnh nhỏ hơn hoặc nén lại trước khi tải lên.`,
      400
    );
  }
  if (value.startsWith('data:') && !value.startsWith('data:image/')) {
    throw new AppError(`${label} phải là ảnh hợp lệ (data:image/...)!`, 400);
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const VN_PHONE_REGEX = /^0\d{9}$/;

const assertValidPhone = (phone) => {
  const trimmed = String(phone || '').trim();
  if (!trimmed) {
    throw new AppError('Số điện thoại không được để trống!', 400);
  }
  if (!VN_PHONE_REGEX.test(trimmed)) {
    throw new AppError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0!', 400);
  }
  return trimmed;
};

const PROTECTED_PROFILE_ROLES = new Set([
  'admin',
  'ctsv',
  'partner',
  'icpdp',
  'club_manager',
  'staff',
]);

const fixLegacyUserRole = async (user) => {
  if (!user?.role) return;
  const normalized = normalizeRole(user.role);
  if (user.role === normalized) return;
  user.role = normalized;
  await User.updateOne({ _id: user._id }, { $set: { role: normalized } });
};

const getProfile = async (email) => {
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    throw new AppError('Không tìm thấy thông tin người dùng!', 404);
  }

  const role = normalizeRole(user.role);
  if (PROTECTED_PROFILE_ROLES.has(role)) {
    await fixLegacyUserRole(user);
  } else {
    await User.syncAndPersistUserProfile(user);
  }

  return { user: sanitizeUser(user) };
};

const updateUserAvatar = async (email, picture) => {
  assertValidImageDataUrl(picture, 'Ảnh đại diện');
  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user) {
    throw new AppError('Không tìm thấy thông tin người dùng!', 404);
  }
  await fixLegacyUserRole(user);
  const result = await User.updateOne(
    { _id: user._id },
    { $set: { picture, avatar: picture } }
  );
  if (result.matchedCount === 0) {
    throw new AppError('Không tìm thấy thông tin người dùng!', 404);
  }
  user.picture = picture;
  user.avatar = picture;
  return {
    message: 'Đã cập nhật ảnh đại diện.',
    user: sanitizeUser(user),
  };
};

const updateProfile = async (email, body) => {
  const { fullname, phone, orientation, interests, picture, avatar, course } = body;

  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    throw new AppError('Không tìm thấy thông tin người dùng!', 404);
  }

  await fixLegacyUserRole(user);

  const onlyAvatarUpdate =
    (picture !== undefined || avatar !== undefined) &&
    fullname === undefined &&
    phone === undefined &&
    orientation === undefined &&
    interests === undefined &&
    course === undefined;

  if (onlyAvatarUpdate) {
    return updateUserAvatar(email, picture ?? avatar);
  }

  if (user.role === 'student') {
    if (fullname !== undefined && fullname.trim() !== (user.fullname || '')) {
      throw new AppError('Sinh viên không được phép thay đổi họ và tên!', 403);
    }
    if (course !== undefined && course !== user.course) {
      throw new AppError('Sinh viên không được phép thay đổi khóa học!', 403);
    }
  } else if (fullname !== undefined) {
    if (!fullname.trim()) {
      throw new AppError('Họ và tên không được để trống!', 400);
    }
    user.fullname = fullname.trim();
  }

  let picturePayload = null;
  if (picture !== undefined) {
    assertValidImageDataUrl(picture, 'Ảnh đại diện');
    picturePayload = picture;
  } else if (avatar !== undefined) {
    assertValidImageDataUrl(avatar, 'Ảnh đại diện');
    picturePayload = avatar;
  }

  if (phone !== undefined) {
    const trimmedPhone = assertValidPhone(phone);
    const phoneExists = await User.findOne({
      phone: trimmedPhone,
      _id: { $ne: user._id },
    });
    if (phoneExists) {
      throw new AppError('Số điện thoại đã được sử dụng bởi tài khoản khác!', 400);
    }
    user.phone = trimmedPhone;
  }

  if (orientation !== undefined) {
    user.orientation = orientation.trim();
  }

  if (interests !== undefined) {
    user.interests = interests;
  }

  if (user.role !== 'student' && course !== undefined && course !== user.course) {
    if (user.courseChanged) {
      throw new AppError('Khóa học chỉ được phép thay đổi 1 lần duy nhất!', 400);
    }
    user.course = course;
    user.courseChanged = true;
  }

  const hasOtherUpdates =
    fullname !== undefined ||
    phone !== undefined ||
    orientation !== undefined ||
    interests !== undefined ||
    course !== undefined;

  if (picturePayload !== null) {
    await User.updateOne(
      { _id: user._id },
      { $set: { picture: picturePayload, avatar: picturePayload } }
    );
    user.picture = picturePayload;
    user.avatar = picturePayload;
  }

  if (hasOtherUpdates) {
    User.syncCourseFromStudentId(user);
    await user.save();
  }

  return {
    message: 'Cập nhật thông tin cá nhân thành công!',
    user: sanitizeUser(user),
  };
};

const changePassword = async (email, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new AppError('Vui lòng cung cấp đầy đủ thông tin!', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('Mật khẩu mới phải có ít nhất 6 ký tự!', 400);
  }

  if (currentPassword === newPassword) {
    throw new AppError('Mật khẩu mới không được trùng với mật khẩu hiện tại!', 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('Không tìm thấy người dùng!', 404);
  }

  if (!user.passwordHash) {
    throw new AppError('Tài khoản này sử dụng đăng nhập Google, không thể đổi mật khẩu!', 400);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isMatch) {
    throw new AppError('Mật khẩu hiện tại không chính xác!', 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return { message: 'Thay đổi mật khẩu thành công!' };
};

const verifyPassword = async (email, password) => {
  if (!password) {
    const err = new AppError('Vui lòng nhập mật khẩu!', 400);
    err.extra = { valid: false };
    throw err;
  }

  const user = await User.findOne({ email });

  if (!user || !user.passwordHash) {
    const err = new AppError('Không thể xác minh mật khẩu!', 400);
    err.extra = { valid: false };
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  return { valid };
};

module.exports = {
  getProfile,
  updateProfile,
  updateUserAvatar,
  changePassword,
  verifyPassword,
};
