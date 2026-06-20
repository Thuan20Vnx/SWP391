const PASSWORD_MIN_LENGTH = 8;

/**
 * @param {string} password
 * @param {{ minLength?: number, requireStrong?: boolean }} [options]
 *   Khi không truyền, dùng mặc định (>=8 ký tự, có hoa + ký tự đặc biệt) để
 *   giữ tương thích ngược.
 */
const validatePasswordPolicy = (password, options = {}) => {
  const minLength = Number(options.minLength) || PASSWORD_MIN_LENGTH;
  const requireStrong = options.requireStrong !== false;

  if (!password || password.length < minLength) {
    return {
      valid: false,
      message: `Mật khẩu phải có ít nhất ${minLength} ký tự.`,
    };
  }

  if (requireStrong) {
    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: 'Mật khẩu phải có ít nhất một chữ viết hoa.',
      };
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return {
        valid: false,
        message: 'Mật khẩu phải có ít nhất một ký tự đặc biệt.',
      };
    }
  }

  return { valid: true };
};

module.exports = {
  PASSWORD_MIN_LENGTH,
  validatePasswordPolicy,
};
