import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../utils/api';

const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^0[3|5|7|8|9][0-9]{8}$/
};

const ForgotPassword = ({ showToast }) => {
  const [contact, setContact] = useState('');
  const [errors, setErrors] = useState(false);
  const [validFields, setValidFields] = useState(false);
  const [shakeFields, setShakeFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleBlocked, setGoogleBlocked] = useState(false);
  const [googleBlockedMsg, setGoogleBlockedMsg] = useState('');
  
  const [countdown, setCountdown] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown(prev => prev - 1);
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
    validateContact(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isCounting) return;

    const isValid = validateContact(contact);

    if (!isValid) {
      setShakeFields(true);
      setTimeout(() => setShakeFields(false), 1000);
      showToast('Vui lòng nhập Email hoặc Số điện thoại hợp lệ!', 'error');
      return;
    }

    setLoading(true);

    fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: contact })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoading(false);
        if (status === 200) {
          setGoogleBlocked(false);
          setCountdown(60);
          setIsCounting(true);
        } else if (status === 403 && data.code === 'GOOGLE_ACCOUNT') {
          setGoogleBlocked(true);
          setGoogleBlockedMsg(data.message || 'Tài khoản này đăng nhập bằng Google.');
          setErrors(true);
          showToast(data.message, 'error');
        } else {
          showToast(data.message || 'Gửi mã xác nhận thất bại!', 'error');
        }
      })
      .catch(err => {
        setLoading(false);
        showToast('Không thể kết nối đến máy chủ Backend!', 'error');
      });
  };

  const getGroupClass = () => {
    return `input-group ${errors ? 'invalid' : ''} ${validFields ? 'valid' : ''} ${shakeFields ? 'shake' : ''}`;
  };

  return (
    <main className="page-container forgot-page">
      {/* Left Column: Branding (40%) */}
      <section className="branding-column" aria-label="Giới thiệu FPT Event">
        <div className="glass-overlay"></div>
        <div className="branding-content">
          <div className="slogan-container forgot-slogan">
            <h1 className="slogan-title">FPT Event</h1>
            <p className="slogan-desc">Kiến tạo trải nghiệm, kết nối cộng đồng.</p>
          </div>
        </div>
      </section>

      {/* Right Column: Form (60%) */}
      <section className="form-column" aria-label="Biểu mẫu khôi phục mật khẩu" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Forgot Card Container */}
        <div className="forgot-card">
          {/* Badge Header */}
          <header className="forgot-header">
            <div className="badge-circle">
              <svg width="28" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <circle cx="12" cy="11" r="2.5"></circle>
                <path d="M12 13.5V16"></path>
              </svg>
            </div>
            <h1>Khôi phục mật khẩu</h1>
            <p>Đừng lo lắng! Vui lòng nhập Email hoặc Số điện thoại bạn đã dùng để đăng ký tài khoản <strong>email/mật khẩu</strong>. Tài khoản đăng nhập Google không hỗ trợ đặt lại mật khẩu tại đây.</p>
          </header>

          {googleBlocked && (
            <div style={{ marginBottom: '12px', padding: '12px 14px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', fontSize: '14px', lineHeight: 1.5 }}>
              {googleBlockedMsg}
              <div style={{ marginTop: '8px' }}>
                <Link to="/login" className="accent-link" style={{ fontWeight: 700 }}>
                  Quay lại đăng nhập bằng Google
                </Link>
              </div>
            </div>
          )}

          {/* Form */}
          <form id="forgot-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Contact Field */}
            <div className={getGroupClass()} id="group-contact" style={{ marginBottom: '0px' }}>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
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
                <label htmlFor="contact">Email hoặc Số điện thoại</label>
              </div>
              <span className="error-message" id="error-contact">Vui lòng nhập email hoặc số điện thoại hợp lệ</span>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              id="forgot-btn" 
              className={`primary-button ${isCounting ? 'btn-countdown' : ''}`}
              style={{ height: '46px' }}
              disabled={loading || isCounting || googleBlocked}
            >
              {loading ? (
                <span className="btn-spinner"></span>
              ) : isCounting ? (
                <span className="btn-text">Đã gửi mã ({countdown}s)</span>
              ) : (
                <span className="btn-text">Gửi mã xác nhận</span>
              )}
            </button>

            {isCounting && (
              <div style={{ marginTop: '20px', textAlign: 'center', background: '#fdf2eb', padding: '16px', borderRadius: '12px', border: '1px solid #f9b691' }}>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '8px', lineHeight: '1.4' }}>
                  Bạn đã nhận được email khôi phục? Nhấp vào liên kết dưới đây để tới trang xác minh và đặt lại mật khẩu mới:
                </p>
                <Link 
                  to={`/reset-password?email=${encodeURIComponent(contact)}`} 
                  className="accent-link"
                  style={{ fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}
                >
                  Xác minh OTP & Đổi mật khẩu
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            )}

            {/* Back Navigation Link */}
            <Link to="/login" className="back-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Quay lại Đăng nhập</span>
            </Link>
          </form>
        </div>

        {/* Copyright Footer */}
        <footer className="copyright-footer">
          © 2024 FPT EVENT MANAGEMENT. ALL RIGHTS RESERVED.
        </footer>
      </section>
    </main>
  );
};

export default ForgotPassword;
