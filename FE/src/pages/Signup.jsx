import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../assets/brand';
import { API_BASE } from '../utils/api';
import { startGoogleLogin } from '../utils/googleAuth';
import OtpInput from '../components/OtpInput';
import {
  saveSignupOtpSession,
  readSignupOtpSession,
  clearSignupOtpSession,
  refreshSignupOtpSession,
  setSignupOtpLock,
  updateSignupOtpAttempts,
  getSignupOtpLockRemaining,
  clearSignupOtpLock,
} from '../utils/signupOtpSession';

const MAX_OTP_ATTEMPTS = 5;

const patterns = {
  fullname: /^[\p{L}\s]{5,50}$/u,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^0[3|5|7|8|9][0-9]{8}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

const Signup = ({ showToast }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: false
  });

  const [errors, setErrors] = useState({});
  const [validFields, setValidFields] = useState({});
  const [shakeFields, setShakeFields] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleAccountError, setGoogleAccountError] = useState('');

  // OTP related states
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [otpErrorMsg, setOtpErrorMsg] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_OTP_ATTEMPTS);
  const [otpLocked, setOtpLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const [isOtpCounting, setIsOtpCounting] = useState(false);

  const applyOtpLock = (retryAfterSeconds) => {
    const seconds = Math.max(0, Number(retryAfterSeconds) || 120);
    setSignupOtpLock(seconds, 0);
    setOtpLocked(true);
    setLockCountdown(seconds);
    setOtpCode('');
    setOtpError(false);
    setOtpErrorMsg('');
  };

  const enterOtpStep = ({ email, fullname, phone }) => {
    saveSignupOtpSession({ email, fullname, phone });
    setFormData((prev) => ({ ...prev, email, fullname, phone }));
    setShowOtpStep(true);
    setCountdown(60);
    setIsOtpCounting(true);
    setOtpCode('');
    setOtpError(false);
    setRemainingAttempts(MAX_OTP_ATTEMPTS);
    setSearchParams({ step: 'otp' }, { replace: true });
  };

  const exitOtpStep = () => {
    clearSignupOtpSession();
    setShowOtpStep(false);
    setOtpCode('');
    setOtpError(false);
    setOtpLocked(false);
    setLockCountdown(0);
    setRemainingAttempts(MAX_OTP_ATTEMPTS);
    setSearchParams({}, { replace: true });
  };

  useEffect(() => {
    const session = readSignupOtpSession();

    if (!session) {
      if (searchParams.get('step') === 'otp') {
        setSearchParams({}, { replace: true });
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      email: session.email,
      fullname: session.fullname,
      phone: session.phone,
    }));
    setShowOtpStep(true);
    setCountdown(0);
    setIsOtpCounting(false);
    setRemainingAttempts(session.remainingAttempts ?? MAX_OTP_ATTEMPTS);

    const lockRemaining = getSignupOtpLockRemaining();
    if (lockRemaining > 0) {
      setOtpLocked(true);
      setLockCountdown(lockRemaining);
      setOtpError(false);
      setOtpErrorMsg('');
    }

    if (searchParams.get('step') !== 'otp') {
      setSearchParams({ step: 'otp' }, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!otpLocked) return undefined;

    const tick = () => {
      const remaining = getSignupOtpLockRemaining();
      if (remaining <= 0) {
        clearSignupOtpLock();
        setOtpLocked(false);
        setLockCountdown(0);
        setOtpError(false);
        setOtpErrorMsg('');
        setRemainingAttempts(MAX_OTP_ATTEMPTS);
        return;
      }
      setLockCountdown(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [otpLocked]);

  useEffect(() => {
    let timer;
    if (isOtpCounting && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsOtpCounting(false);
    }
    return () => clearInterval(timer);
  }, [isOtpCounting, countdown]);


  const validateField = (name, value) => {
    let isValid = false;
    let customCheck = true;

    if (name === 'fullname') {
      isValid = patterns.fullname.test(value.trim());
      if (isValid) {
        const parts = value.trim().split(/\s+/);
        customCheck = parts.length >= 2;
      }
    } else if (name === 'email') {
      isValid = patterns.email.test(value.trim());
    } else if (name === 'phone') {
      isValid = patterns.phone.test(value.trim());
    } else if (name === 'password') {
      isValid = patterns.password.test(value);
    } else if (name === 'confirmPassword') {
      isValid = value !== '' && value === formData.password;
    } else if (name === 'terms') {
      isValid = value === true;
    }

    const finalValid = isValid && customCheck;

    setErrors(prev => ({ ...prev, [name]: !finalValid }));
    setValidFields(prev => ({ ...prev, [name]: finalValid }));

    return finalValid;
  };

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    const name = id === 'terms-checkbox' ? 'terms' : id === 'confirm-password' ? 'confirmPassword' : id;
    const val = type === 'checkbox' ? checked : value;

    setFormData(prev => {
      const updated = { ...prev, [name]: val };
      // Real-time validation
      if (name === 'password' && updated.confirmPassword) {
        // re-validate confirm password if password changes
        setTimeout(() => validateField('confirmPassword', updated.confirmPassword), 0);
      }
      return updated;
    });

    validateField(name, val);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, email: value }));
    setGoogleAccountError('');

    const isValid = patterns.email.test(value.trim());

    setErrors(prev => ({ ...prev, email: !isValid }));
    setValidFields(prev => ({ ...prev, email: isValid }));

    const errorSpan = document.getElementById('error-email');
    if (errorSpan) {
      errorSpan.textContent = "Vui lòng nhập email hợp lệ";
      errorSpan.style.color = "var(--border-error)";
    }
  };

  const triggerShake = (name) => {
    setShakeFields(prev => ({ ...prev, [name]: true }));
    setTimeout(() => {
      setShakeFields(prev => ({ ...prev, [name]: false }));
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const isNameValid = validateField('fullname', formData.fullname);
    const isEmailValid = validateField('email', formData.email);
    const isPhoneValid = validateField('phone', formData.phone);
    const isPasswordValid = validateField('password', formData.password);
    const isConfirmValid = validateField('confirmPassword', formData.confirmPassword);
    const isTermsValid = validateField('terms', formData.terms);

    const isFormValid = isNameValid && isEmailValid && isPhoneValid && isPasswordValid && isConfirmValid && isTermsValid;

    if (!isFormValid) {
      if (!isNameValid) triggerShake('fullname');
      if (!isEmailValid) triggerShake('email');
      if (!isPhoneValid) triggerShake('phone');
      if (!isPasswordValid) triggerShake('password');
      if (!isConfirmValid) triggerShake('confirmPassword');
      if (!isTermsValid) triggerShake('terms');

      return;
    }

    setLoading(true);

    fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: formData.fullname,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoading(false);
        if (status === 200 && data.status === 'OTP_SENT') {
          setGoogleAccountError('');
          enterOtpStep({
            email: formData.email.trim(),
            fullname: formData.fullname.trim(),
            phone: formData.phone.trim(),
          });
        } else if (status === 409 && data.code === 'GOOGLE_ACCOUNT') {
          setGoogleAccountError(data.message || 'Email đã được đăng ký bằng Google.');
          setErrors(prev => ({ ...prev, email: true }));
          triggerShake('email');
        } else {
          setGoogleAccountError(data.message || 'Đăng ký thất bại!');
          setErrors((prev) => ({ ...prev, email: true }));
        }
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const handleOtpFailure = (status, data) => {
    if (status === 423 || data.code === 'OTP_LOCKED') {
      applyOtpLock(data.retryAfterSeconds || 120);
      setOtpCode('');
      return;
    }

    setOtpError(true);
    setOtpErrorMsg(data.message || 'Mã xác minh không chính xác!');
    setOtpCode('');

    if (typeof data.remainingAttempts === 'number') {
      setRemainingAttempts(data.remainingAttempts);
      updateSignupOtpAttempts(data.remainingAttempts);
      if (data.remainingAttempts <= 0) {
        applyOtpLock(120);
      }
      return;
    }

    setRemainingAttempts((prev) => {
      const next = Math.max(0, prev - 1);
      updateSignupOtpAttempts(next);
      if (next <= 0) {
        applyOtpLock(120);
      } else {
        setOtpErrorMsg(`Mã OTP không chính xác. Còn ${next}/${MAX_OTP_ATTEMPTS} lần thử.`);
      }
      return next;
    });
  };

  const submitOtpVerification = (codeOverride) => {
    const code = (codeOverride ?? otpCode).trim();

    if (otpLocked) {
      return;
    }

    if (otpLoading) return;

    if (code.length !== 6) {
      setOtpError(true);
      setOtpErrorMsg('Mã OTP phải có đúng 6 chữ số!');
      return;
    }

    setOtpLoading(true);

    fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        otp: code,
      }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setOtpLoading(false);
        if (status === 201) {
          clearSignupOtpSession();
          setFormData({
            fullname: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            terms: false,
          });
          setErrors({});
          setValidFields({});
          setOtpCode('');
          setOtpError(false);
          setShowOtpStep(false);
          setOtpLocked(false);
          setLockCountdown(0);
          navigate('/login');
        } else {
          handleOtpFailure(status, data);
        }
      })
      .catch(() => {
        setOtpLoading(false);
        setOtpError(true);
        setOtpErrorMsg('Không thể kết nối máy chủ. Vui lòng thử lại.');
      });
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    submitOtpVerification();
  };

  const handleResendOtp = () => {
    if (otpLocked) {
      return;
    }

    setCountdown(60);
    setIsOtpCounting(true);
    setOtpCode('');
    setOtpError(false);

    fetch(`${API_BASE}/api/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200) {
          refreshSignupOtpSession({
            email: formData.email.trim(),
            fullname: formData.fullname.trim(),
            phone: formData.phone.trim(),
          });
        } else if (status === 423 || data.code === 'OTP_LOCKED') {
          applyOtpLock(data.retryAfterSeconds || 120);
        } else {
          setOtpError(true);
          setOtpErrorMsg(data.message || 'Gửi lại mã thất bại!');
        }
      })
      .catch(() => {
        setOtpError(true);
        setOtpErrorMsg('Không thể kết nối máy chủ. Vui lòng thử lại.');
      });
  };


  const handleSsoClick = () => {};

  const loginWithGoogle = () => startGoogleLogin();

  const getGroupClass = (name) => {
    return `input-group ${errors[name] ? 'invalid' : ''} ${validFields[name] ? 'valid' : ''} ${shakeFields[name] ? 'shake' : ''}`;
  };

  return (
    <main className="page-container">
      {/* Left Column: Branding (40%) */}
      <section className="branding-column" aria-label="Giới thiệu cộng đồng FPT">
        <div className="glass-overlay"></div>
        <div className="branding-content">
          {/* Slogans */}
          <div className="slogan-container">
            <p className="slogan-tag">Kiến tạo tương lai</p>
            <p className="slogan-desc">Kết nối hàng ngàn sinh viên thông qua những sự kiện công nghệ và văn hóa hàng đầu tại FPT.</p>
          </div>
        </div>
      </section>

      {/* Right Column: Signup Form (60%) */}
      <section className="form-column" aria-label="Biểu mẫu đăng ký tài khoản">
        <div className="auth-form-shell">
          <Link to="/" className="auth-page-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Quay lại trang chủ</span>
          </Link>

        <div className="form-container">
          {showOtpStep ? (
            <>
              {/* Logo F-Events */}
              <div className="login-logo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0px' }}>
                <img
                  src={FE_LOGO}
                  alt="F-Events Logo"
                  style={{ width: '115px', height: '64px', objectFit: 'contain' }}
                />
              </div>

              {/* Header */}
              <header className="form-header" style={{ textAlign: 'center', marginBottom: '8px' }}>
                <h1 id="main-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Xác minh Email</h1>
                <p className="subtitle" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  Chúng tôi đã gửi mã xác minh 6 chữ số tới email <strong style={{ color: 'var(--primary)' }}>{formData.email}</strong>
                </p>
              </header>

              {otpLocked && (
                <div
                  role="alert"
                  style={{
                    marginBottom: '12px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: '#fef2f2',
                    border: '2px solid #fca5a5',
                    color: '#991b1b',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                    OTP tạm thời bị khóa
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginBottom: '6px' }}>
                    {Math.floor(lockCountdown / 60)}:{String(lockCountdown % 60).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    Thử lại sau khi hết thời gian đếm ngược
                  </div>
                </div>
              )}

              {/* OTP Form */}
              <form id="otp-form" onSubmit={handleOtpSubmit} noValidate>
                <label className="otp-input__label" htmlFor="signup-otp-0">
                  Mã xác minh OTP (6 số)
                </label>
                <OtpInput
                  idPrefix="signup-otp"
                  value={otpCode}
                  disabled={otpLocked || otpLoading}
                  invalid={otpError}
                  valid={otpCode.length === 6 && !otpError && !otpLoading}
                  autoFocus
                  onChange={(val) => {
                    setOtpCode(val);
                    if (val.length === 6) setOtpError(false);
                  }}
                  onComplete={(code) => submitOtpVerification(code)}
                />
                {otpLoading && (
                  <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: '8px' }}>
                    Đang xác minh OTP...
                  </p>
                )}
                {otpError && !otpLocked && (
                  <span className="otp-input__error">{otpErrorMsg}</span>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <button
                    type="button"
                    className="accent-link"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                    onClick={exitOtpStep}
                  >
                    Thay đổi email
                  </button>

                  {isOtpCounting ? (
                    <span style={{ color: 'var(--text-muted)' }}>Gửi lại mã sau {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      className="accent-link"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: otpLocked ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit', opacity: otpLocked ? 0.5 : 1 }}
                      onClick={handleResendOtp}
                      disabled={otpLocked}
                    >
                      Gửi lại mã
                    </button>
                  )}
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Logo F-Events */}
              <div className="login-logo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0px' }}>
                <img
                  src={FE_LOGO}
                  alt="F-Events Logo"
                  style={{ width: '115px', height: '64px', objectFit: 'contain' }}
                />
              </div>

              {/* Header */}
              <header className="form-header" style={{ textAlign: 'center', marginBottom: '8px' }}>
                <h1 id="main-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Tạo tài khoản mới</h1>
                <p className="subtitle" style={{ fontSize: '0.9rem', color: '#64748b' }}>Tham gia cộng đồng sự kiện lớn nhất tại FPT</p>
              </header>

              {/* Main Form */}
              <form id="signup-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* Full Name Field */}
                <div className={getGroupClass('fullname')} id="group-fullname" style={{ marginBottom: '0px' }}>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </span>
                    <input
                      type="text"
                      id="fullname"
                      placeholder=" "
                      required
                      autoComplete="name"
                      value={formData.fullname}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="fullname">Họ và tên</label>
                  </div>
                  <span className="error-message" id="error-fullname">Vui lòng nhập họ và tên hợp lệ (tối thiểu 5 ký tự và ít nhất 2 từ)</span>
                </div>

                {/* Email Field */}
                <div className={getGroupClass('email')} id="group-email" style={{ marginBottom: '0px' }}>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
                    <input
                      type="email"
                      id="email"
                      placeholder=" "
                      required
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                    />
                    <label htmlFor="email">Email</label>
                  </div>
                  <span className="error-message" id="error-email">
                    {googleAccountError || 'Vui lòng nhập email hợp lệ (ví dụ: student@fpt.edu.vn)'}
                  </span>
                  {googleAccountError && (
                    <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
                      <Link to="/login" className="accent-link" style={{ fontWeight: 700 }}>
                        Đăng nhập bằng Google
                      </Link>
                    </p>
                  )}
                </div>

                {/* Phone Number Field */}
                <div className={getGroupClass('phone')} id="group-phone" style={{ marginBottom: '0px' }}>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                    </span>
                    <input
                      type="tel"
                      id="phone"
                      placeholder=" "
                      required
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="phone">Số điện thoại</label>
                  </div>
                  <span className="error-message" id="error-phone">Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0</span>
                </div>

                {/* Password Field */}
                <div className={getGroupClass('password')} id="group-password" style={{ marginBottom: '0px' }}>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder=" "
                      required
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="password">Mật khẩu</label>
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                    >
                      {showPassword ? (
                        <svg className="eye-on" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      ) : (
                        <svg className="eye-off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      )}
                    </button>
                  </div>
                  <span className="error-message" id="error-password">Mật khẩu từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt</span>
                </div>

                {/* Confirm Password Field */}
                <div className={getGroupClass('confirmPassword')} id="group-confirm-password" style={{ marginBottom: '0px' }}>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirm-password"
                      placeholder=" "
                      required
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="confirm-password">Xác nhận mật khẩu</label>
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                    >
                      {showConfirmPassword ? (
                        <svg className="eye-on" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      ) : (
                        <svg className="eye-off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      )}
                    </button>
                  </div>
                  <span className="error-message" id="error-confirm-password">Mật khẩu xác nhận không khớp</span>
                </div>

                {/* Terms Checkbox */}
                <div className={`checkbox-group ${errors.terms ? 'invalid' : ''} ${shakeFields.terms ? 'shake' : ''}`} style={{ marginBottom: '0px' }}>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      id="terms-checkbox"
                      required
                      checked={formData.terms}
                      onChange={handleInputChange}
                    />
                    <span className="checkbox-checkmark"></span>
                    <span className="checkbox-label">
                      Tôi đồng ý với các <a href="#" className="accent-link" onClick={(e) => e.preventDefault()}>Điều khoản</a> và <a href="#" className="accent-link" onClick={(e) => e.preventDefault()}>Chính sách</a> của hệ thống
                    </span>
                  </label>
                  <span className="error-message" id="error-terms">Bạn phải đồng ý với điều khoản dịch vụ để tiếp tục</span>
                </div>

                {/* Submit Button */}
                <button type="submit" id="signup-btn" className="primary-button" disabled={loading} style={{ height: '46px', marginTop: '4px' }}>
                  {loading ? (
                    <span className="btn-spinner"></span>
                  ) : (
                    <span className="btn-text">Đăng ký</span>
                  )}
                </button>
              </form>

              {/* Footer / Login Redirection */}
              <footer className="form-footer" style={{ marginTop: '14px' }}>
                <p className="login-redirect" style={{ marginBottom: '10px' }}>Đã có tài khoản? <Link to="/login" id="login-link" className="accent-link">Đăng nhập ngay</Link></p>

                {/* SSO Section */}
                <div className="sso-divider" style={{ margin: '14px 0 10px 0' }}>
                  <span>HOẶC</span>
                </div>

                <div className="sso-buttons">
                  {/* Google SSO */}
                  <button type="button" id="google-login" className="sso-button" onClick={loginWithGoogle} style={{ height: '44px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Google</span>
                  </button>
                </div>
              </footer>
            </>
          )}
        </div>
        </div>
      </section>

    </main>
  );
};

export default Signup;
