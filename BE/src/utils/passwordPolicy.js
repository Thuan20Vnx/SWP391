const PASSWORD_MIN_LENGTH = 8;

const validatePasswordPolicy = (password) => {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
    };
  }

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

  return { valid: true };
};

module.exports = {
  PASSWORD_MIN_LENGTH,
  validatePasswordPolicy,
};
