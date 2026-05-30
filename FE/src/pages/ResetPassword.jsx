import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/api';
import { PASSWORD_POLICY_HINT, validatePasswordPolicy } from '../utils/password';
import OtpInput from '../components/OtpInput';

const MAX_OTP_ATTEMPTS = 5;

const ResetPassword = ({ showToast }) => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState({
    email: false,
    otp: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordErrorMsg, setPasswordErrorMsg] = useState(PASSWORD_POLICY_HINT);
  const [otpLocked, setOtpLocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_OTP_ATTEMPTS);
  const [shakeFields, setShakeFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email') || '';
    const otpParam = params.get('otp') || '';

    if (emailParam) setEmail(decodeURIComponent(emailParam));
    if (otpParam) setOtp(otpParam);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (otpLocked) {
      showToast('OTP đã bị khóa. Vui lòng quay lại trang Quên mật khẩu để nhận mã mới.', 'error');
      return;
    }

    const passwordCheck = validatePasswordPolicy(newPassword);
    const newErrors = {
      email: !email.trim() || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim()),
      otp: !otp.trim() || otp.trim().length !== 6,
      newPassword: !passwordCheck.valid,
      confirmPassword: !confirmPassword || newPassword !== confirmPassword,
    };

    setErrors(newErrors);
    if (!passwordCheck.valid) {
      setPasswordErrorMsg(passwordCheck.message);
    }

    if (Object.values(newErrors).some(Boolean)) {
      setShakeFields(true);
      setTimeout(() => setShakeFields(false), 1000);

      if (newErrors.email) {
        showToast('Vui lòng nhập Email hợp lệ!', 'error');
      } else if (newErrors.otp) {
        showToast('Mã OTP phải có đúng 6 chữ số!', 'error');
      } else if (newErrors.newPassword) {
        showToast(passwordCheck.message || PASSWORD_POLICY_HINT, 'error');
      } else if (newErrors.confirmPassword) {
        showToast('Xác nhận mật khẩu mới không khớp!', 'error');
      } else {
        showToast('Vui lòng điền đầy đủ và đúng thông tin!', 'error');
      }
      return;
    }

    setLoading(true);

    fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoading(false);
        if (status === 200) {
          showToast(data.message || 'Đặt lại mật khẩu thành công!', 'success');
          navigate('/login');
          return;
        }

        if (status === 423) {
          setOtpLocked(true);
          setRemainingAttempts(0);
          showToast(data.message || 'OTP đã bị khóa do nhập sai quá 5 lần.', 'error');
          return;
        }

        const match = String(data.message || '').match(/Còn (\d+) lần thử/);
        if (match) {
          setRemainingAttempts(Number(match[1]));
        }

        showToast(data.message || 'Mã OTP không hợp lệ hoặc đã hết hạn!', 'error');
      })
      .catch(() => {
        setLoading(false);
        showToast('Không thể kết nối đến máy chủ Backend!', 'error');
      });
  };

  return (
    <main className="page-container forgot-page">
      <section className="branding-column" aria-label="Giới thiệu FPT Event">
        <div className="glass-overlay"></div>
        <div className="branding-content">
          <div className="slogan-container forgot-slogan">
            <h1 className="slogan-title">FPT Event</h1>
            <p className="slogan-desc">Kiến tạo trải nghiệm, kết nối cộng đồng.</p>
          </div>
        </div>
      </section>

      <section
        className="form-column"
        aria-label="Biểu mẫu đặt lại mật khẩu"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className={`forgot-card ${shakeFields ? 'shake' : ''}`}>
          <header className="forgot-header">
            <div className="badge-circle">
              <svg width="28" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h1>Đặt lại mật khẩu</h1>
            <p>Vui lòng xác minh mã OTP gửi tới Email của bạn để hoàn tất đổi mật khẩu mới.</p>
          </header>

          {otpLocked ? (
            <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fff3f3', color: '#b42318', fontSize: '14px', lineHeight: 1.5 }}>
              Bạn đã nhập sai OTP quá {MAX_OTP_ATTEMPTS} lần. Vui lòng quay lại trang Quên mật khẩu để nhận mã mới.
            </div>
          ) : (
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#667085' }}>
              Còn {remainingAttempts}/{MAX_OTP_ATTEMPTS} lần nhập OTP.
            </p>
          )}

          <form id="reset-password-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className={`input-group ${errors.email ? 'invalid' : ''}`} style={{ marginBottom: '0px' }}>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder=" "
                  required
                  value={email}
                  disabled={otpLocked}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: false }));
                  }}
                />
                <label>Email đăng ký</label>
              </div>
              <span className="error-message">Vui lòng nhập email hợp lệ</span>
            </div>

            <div style={{ marginBottom: '4px' }}>
              <label className="otp-input__label" htmlFor="reset-otp-0">
                Mã xác minh OTP (6 số)
              </label>
              <OtpInput
                idPrefix="reset-otp"
                value={otp}
                disabled={otpLocked}
                invalid={errors.otp}
                valid={otp.length === 6 && !errors.otp}
                autoFocus
                onChange={(val) => {
                  setOtp(val);
                  setErrors((prev) => ({ ...prev, otp: false }));
                }}
              />
              {errors.otp && (
                <span className="otp-input__error">Mã OTP phải có đúng 6 chữ số</span>
              )}
            </div>

            <div className={`input-group ${errors.newPassword ? 'invalid' : ''}`} style={{ marginBottom: '0px' }}>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder=" "
                  required
                  value={newPassword}
                  disabled={otpLocked}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, newPassword: false }));
                    setPasswordErrorMsg(PASSWORD_POLICY_HINT);
                  }}
                />
                <label>Mật khẩu mới</label>
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              <span className="error-message">{passwordErrorMsg}</span>
            </div>

            <div className={`input-group ${errors.confirmPassword ? 'invalid' : ''}`} style={{ marginBottom: '0px' }}>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder=" "
                  required
                  value={confirmPassword}
                  disabled={otpLocked}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, confirmPassword: false }));
                  }}
                />
                <label>Xác nhận mật khẩu</label>
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              <span className="error-message">Mật khẩu xác nhận không khớp</span>
            </div>

            <button
              type="submit"
              id="reset-btn"
              className="primary-button"
              disabled={loading || otpLocked}
              style={{ marginTop: '4px', height: '46px' }}
            >
              {loading ? (
                <span className="btn-spinner"></span>
              ) : (
                <span className="btn-text">Xác minh OTP & Đặt lại mật khẩu</span>
              )}
            </button>

            <Link to="/forgot" className="back-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Quay lại trang gửi OTP</span>
            </Link>
          </form>
        </div>

        <footer className="copyright-footer">
          © 2024 FPT EVENT MANAGEMENT. ALL RIGHTS RESERVED.
        </footer>
      </section>
    </main>
  );
};

export default ResetPassword;
