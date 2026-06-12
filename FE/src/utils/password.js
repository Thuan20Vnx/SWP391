export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_HINT =
  'Mật khẩu tối thiểu 8 ký tự, có chữ viết hoa và ký tự đặc biệt.';

export const validatePasswordPolicy = (password) => {
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

export const getPasswordStrength = (password) => {
  if (!password) {
    return { level: null, label: '', bars: 0 };
  }

  let score = 0;
  if (password.length >= 4) score += 1;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (password.length < 4) {
    return { level: 'very-weak', label: 'Cực yếu', bars: 1 };
  }
  if (score <= 3) {
    return { level: 'weak', label: 'Yếu', bars: 2 };
  }
  if (score <= 5) {
    return { level: 'medium', label: 'Vừa', bars: 3 };
  }
  return { level: 'strong', label: 'Mạnh', bars: 4 };
};
