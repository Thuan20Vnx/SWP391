const STORAGE_KEY = 'fevents_signup_otp_pending';
const OTP_TTL_MS = 5 * 60 * 1000;

const writeSession = (data) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
};

export const saveSignupOtpSession = ({ email, fullname, phone }) => {
  const existing = readSignupOtpSession();
  writeSession({
    email,
    fullname,
    phone,
    expiresAt: Date.now() + OTP_TTL_MS,
    lockedUntil: existing?.lockedUntil || null,
    remainingAttempts: existing?.remainingAttempts ?? 5,
  });
};

export const readSignupOtpSession = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data?.email || Date.now() > data.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
      data.lockedUntil = null;
      data.remainingAttempts = 5;
      writeSession(data);
    }

    return data;
  } catch {
    return null;
  }
};

export const clearSignupOtpSession = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

export const refreshSignupOtpSession = ({ email, fullname, phone }) => {
  saveSignupOtpSession({ email, fullname, phone });
};

export const setSignupOtpLock = (retryAfterSeconds, remainingAttempts = 0) => {
  const session = readSignupOtpSession();
  if (!session) return;

  writeSession({
    ...session,
    lockedUntil: Date.now() + retryAfterSeconds * 1000,
    remainingAttempts,
  });
};

export const updateSignupOtpAttempts = (remainingAttempts) => {
  const session = readSignupOtpSession();
  if (!session) return;

  writeSession({
    ...session,
    remainingAttempts,
  });
};

export const getSignupOtpLockRemaining = () => {
  const session = readSignupOtpSession();
  if (!session?.lockedUntil) return 0;
  return Math.max(0, Math.ceil((session.lockedUntil - Date.now()) / 1000));
};

export const clearSignupOtpLock = () => {
  const session = readSignupOtpSession();
  if (!session) return;

  writeSession({
    ...session,
    lockedUntil: null,
    remainingAttempts: 5,
  });
};
