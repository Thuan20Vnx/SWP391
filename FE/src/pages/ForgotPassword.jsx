import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

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
  
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
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
    setShowSnackbar(false); // Hide success message when typing again
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
    setShowSnackbar(false);

    fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: contact })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoading(false);
        if (status === 200) {
          setShowSnackbar(true);
          if (data.isPhone) {
            setSnackbarMessage("Mã OTP đã được gửi đến số điện thoại của bạn!");
          } else {
            setSnackbarMessage("Mã OTP đã được gửi đến email của bạn!");
          }
          setCountdown(60);
          setIsCounting(true);
          showToast('Yêu cầu gửi mã xác nhận thành công!', 'success');
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
        {/* Success Snackbar */}
        <div id="success-snackbar" className={`success-snackbar ${showSnackbar ? '' : 'hidden'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" fill="#ffffff" stroke="#4caf50" strokeWidth="1.5"></circle>
            <polyline points="9 11 12 14 16 9" stroke="#4caf50" strokeWidth="2"></polyline>
          </svg>
          <div className="snackbar-content">
            <span className="snackbar-title">Thành công</span>
            <span className="snackbar-message">{snackbarMessage}</span>
          </div>
          <button type="button" id="close-snackbar" className="snackbar-close" onClick={() => setShowSnackbar(false)} aria-label="Đóng thông báo">&times;</button>
        </div>

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
            <p>Đừng lo lắng! Vui lòng nhập Email hoặc Số điện thoại bạn đã dùng để đăng ký. Chúng tôi sẽ gửi mã xác nhận (OTP) để giúp bạn đặt lại mật khẩu.</p>
          </header>

          {/* Form */}
          <form id="forgot-form" onSubmit={handleSubmit} noValidate>
            {/* Contact Field */}
            <div className={getGroupClass()} id="group-contact" style={{ marginBottom: '24px' }}>
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
              disabled={loading || isCounting}
            >
              {loading ? (
                <span className="btn-spinner"></span>
              ) : isCounting ? (
                <span className="btn-text">Đã gửi mã ({countdown}s)</span>
              ) : (
                <span className="btn-text">Gửi mã xác nhận</span>
              )}
            </button>

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
