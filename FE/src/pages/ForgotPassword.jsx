import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../assets/brand';
import { API_BASE } from '../utils/api';

const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^0[3|5|7|8|9][0-9]{8}$/,
};

const ForgotPassword = ({ showToast }) => {
  const [contact, setContact] = useState('');
  const [errors, setErrors] = useState(false);
  const [validFields, setValidFields] = useState(false);
  const [shakeFields, setShakeFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleBlocked, setGoogleBlocked] = useState(false);
  const [googleBlockedMsg, setGoogleBlockedMsg] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const [isCounting, setIsCounting] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && isCounting) {
      setIsCounting(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown, isCounting]);

  const validateContact = (value) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      setErrors(true);
      setValidFields(false);
      return false;
    }
    const isEmail = patterns.email.test(trimmed);
    const isPhone = patterns.phone.test(trimmed);
    const isValid = isEmail || isPhone;

    setErrors(!isValid);
    setValidFields(isValid);
    return isValid;
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setContact(value);
    setGoogleBlocked(false);
    setGoogleBlockedMsg('');
    setEmailSent(false);
    validateContact(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isCounting) return;

    const isValid = validateContact(contact);

    if (!isValid) {
      setShakeFields(true);
      setTimeout(() => setShakeFields(false), 1000);
      showToast('Vui lòng nhập email hoặc số điện thoại hợp lệ.', 'error');
      return;
    }

    setLoading(true);

    fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoading(false);
        if (status === 200) {
          setGoogleBlocked(false);
          setEmailSent(true);
          setCountdown(60);
          setIsCounting(true);
          showToast('Đã gửi liên kết khôi phục. Kiểm tra hộp thư của bạn.', 'success');
        } else if (status === 403 && data.code === 'GOOGLE_ACCOUNT') {
          setGoogleBlocked(true);
          setGoogleBlockedMsg(data.message || 'Tài khoản này đăng nhập bằng Google.');
          setErrors(true);
          showToast(data.message, 'error');
        } else {
          showToast(data.message || 'Gửi liên kết khôi phục thất bại.', 'error');
        }
      })
      .catch(() => {
        setLoading(false);
        showToast('Không thể kết nối đến máy chủ Backend.', 'error');
      });
  };

  const getGroupClass = () =>
    `input-group ${errors ? 'invalid' : ''} ${validFields ? 'valid' : ''} ${shakeFields ? 'shake' : ''}`;

  return (
    <main className="page-container">
      <section className="branding-column" aria-label="Giới thiệu cộng đồng FPT">
        <div className="glass-overlay" />
        <div className="branding-content">
          <div className="slogan-container">
            <p className="slogan-tag">Kiến tạo tương lai</p>
            <p className="slogan-desc">
              Kết nối hàng ngàn sinh viên thông qua những sự kiện công nghệ và văn hóa hàng đầu tại FPT.
            </p>
          </div>
        </div>
      </section>

      <section className="form-column" aria-label="Biểu mẫu khôi phục mật khẩu">
        <div className="auth-form-shell">
          <Link to="/login" className="auth-page-back">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Quay lại đăng nhập</span>
          </Link>

          <div className="form-container">
            <div className="login-logo-container auth-logo-row">
              <img src={FE_LOGO} alt={FE_LOGO_ALT} className="auth-logo" />
            </div>

            <header className="form-header auth-form-header">
              <h1 id="main-title">Khôi phục mật khẩu</h1>
              <p className="subtitle">
                Nhập email hoặc số điện thoại bạn đã dùng khi đăng ký tài khoản email/mật khẩu.
              </p>
            </header>

            {googleBlocked && (
              <div className="auth-notice auth-notice--warning" role="alert">
                <p>{googleBlockedMsg}</p>
                <Link to="/login" className="auth-notice__link">
                  Đăng nhập bằng Google
                </Link>
              </div>
            )}

            {emailSent && isCounting && (
              <div className="auth-notice auth-notice--success" role="status">
                <p className="auth-notice__title">Liên kết đã được gửi</p>
                <p className="auth-notice__text">
                  Kiểm tra hộp thư hoặc tin nhắn của bạn. Nếu chưa thấy, hãy xem thư mục spam.
                </p>
                <Link
                  to={`/reset-password?email=${encodeURIComponent(contact.trim())}`}
                  className="auth-notice__action"
                >
                  Tiếp tục đặt lại mật khẩu
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            )}

            <form id="forgot-form" className="auth-form-stack" onSubmit={handleSubmit} noValidate>
              <div className={getGroupClass()} id="group-contact">
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    id="contact"
                    placeholder=" "
                    required
                    autoComplete="username"
                    value={contact}
                    onChange={handleInputChange}
                    disabled={isCounting}
                  />
                  <label htmlFor="contact">Email hoặc số điện thoại</label>
                </div>
                <span className="error-message" id="error-contact">
                  Vui lòng nhập email hoặc số điện thoại hợp lệ
                </span>
              </div>

              <button
                type="submit"
                id="forgot-btn"
                className={`primary-button auth-submit-btn ${isCounting ? 'btn-countdown' : ''}`}
                disabled={loading || isCounting || googleBlocked}
              >
                {loading ? (
                  <span className="btn-spinner" />
                ) : isCounting ? (
                  <span className="btn-text">Gửi lại sau {countdown}s</span>
                ) : (
                  <span className="btn-text">Gửi liên kết khôi phục</span>
                )}
              </button>
            </form>

            <footer className="form-footer auth-form-footer">
              <p className="login-redirect">
                <span className="login-redirect-muted">Nhớ mật khẩu?</span>{' '}
                <Link to="/login" className="accent-link auth-accent-link">
                  Đăng nhập
                </Link>
              </p>
              <p className="auth-hint">
                Tài khoản đăng nhập Google không hỗ trợ đặt lại mật khẩu tại đây.
              </p>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;
