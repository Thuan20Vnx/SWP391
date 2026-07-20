/**
 * Tên đăng nhập — định danh phụ bên cạnh email.
 *
 * Quy tắc: 4–20 ký tự, chỉ chữ thường / số / dấu chấm / gạch dưới, bắt đầu bằng
 * chữ cái, không kết thúc bằng dấu chấm hoặc gạch dưới. Luôn lưu ở dạng chữ
 * thường để so sánh không phân biệt hoa thường.
 */

const USERNAME_MIN_LENGTH = 4;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z][a-z0-9._]{2,18}[a-z0-9]$/;

const USERNAME_POLICY_HINT =
  'Tên đăng nhập từ 4 đến 20 ký tự, bắt đầu bằng chữ cái, chỉ gồm chữ thường, số, dấu chấm và gạch dưới.';

/** Tên hệ thống giữ lại, không cho người dùng đăng ký. */
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'info',
  'ctsv', 'icpdp', 'fpt', 'fptu', 'fptevents', 'event', 'events',
  'null', 'undefined', 'me', 'you', 'user', 'guest', 'test',
]);

const normalizeUsername = (raw) => String(raw ?? '').trim().toLowerCase();

/** Chuỗi người dùng nhập ở ô đăng nhập là email hay tên đăng nhập? */
const looksLikeEmail = (raw) => String(raw ?? '').includes('@');

const validateUsername = (raw) => {
  const username = normalizeUsername(raw);

  if (!username) {
    return { valid: false, message: 'Tên đăng nhập không được để trống!' };
  }
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      message: `Tên đăng nhập phải từ ${USERNAME_MIN_LENGTH} đến ${USERNAME_MAX_LENGTH} ký tự!`,
    };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { valid: false, message: USERNAME_POLICY_HINT };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { valid: false, message: 'Tên đăng nhập này không khả dụng. Vui lòng chọn tên khác!' };
  }

  return { valid: true, username, message: '' };
};

/**
 * Sinh tên đăng nhập từ email cho các tài khoản không tự nhập (đăng nhập Google,
 * tài khoản do admin tạo, dữ liệu cũ). `isTaken` là hàm async trả về true nếu
 * tên đã có người dùng.
 */
const deriveUsernameFromEmail = async (email, isTaken) => {
  const localPart = normalizeUsername(email).split('@')[0] || 'user';

  let base = localPart.replace(/[^a-z0-9._]/g, '').replace(/^[^a-z]+/, '').replace(/[^a-z0-9]+$/, '');
  if (base.length < USERNAME_MIN_LENGTH) base = `${base || 'user'}user`;
  base = base.slice(0, USERNAME_MAX_LENGTH - 4);
  if (!USERNAME_PATTERN.test(base)) base = `user${base}`.slice(0, USERNAME_MAX_LENGTH - 4);

  if (!RESERVED_USERNAMES.has(base) && USERNAME_PATTERN.test(base) && !(await isTaken(base))) {
    return base;
  }

  for (let i = 1; i <= 9999; i += 1) {
    const candidate = `${base}${i}`;
    if (!RESERVED_USERNAMES.has(candidate) && !(await isTaken(candidate))) return candidate;
  }

  // Cực hiếm: rơi hết 9999 hậu tố thì dùng chuỗi ngẫu nhiên.
  return `user${Date.now().toString(36)}`.slice(0, USERNAME_MAX_LENGTH);
};

/** Tên đăng nhập đã có người dùng chưa (bỏ qua chính tài khoản đang xét). */
const isUsernameTaken = async (username, excludeUserId = null) => {
  const User = require('../models/User');
  const key = normalizeUsername(username);
  if (!key) return false;
  const query = { username: key };
  if (excludeUserId) query._id = { $ne: excludeUserId };
  return Boolean(await User.exists(query));
};

/** Sinh tên đăng nhập cho tài khoản không tự nhập (Google, admin tạo, dữ liệu cũ). */
const generateUsernameForEmail = (email) =>
  deriveUsernameFromEmail(email, (candidate) => isUsernameTaken(candidate));

module.exports = {
  isUsernameTaken,
  generateUsernameForEmail,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
  USERNAME_POLICY_HINT,
  RESERVED_USERNAMES,
  normalizeUsername,
  looksLikeEmail,
  validateUsername,
  deriveUsernameFromEmail,
};
