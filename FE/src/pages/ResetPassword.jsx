import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ResetPassword = ({ showToast }) => {
  const navigate = useNavigate();
  
  // States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation States
  const [errors, setErrors] = useState({
    email: false,
    otp: false,
    newPassword: false,
    confirmPassword: false
  });
  const [shakeFields, setShakeFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Read email & OTP from URL search query on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email') || '';
    const otpParam = params.get('otp') || '';
    
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    if (otpParam) setOtp(otpParam);
  }, []);

  const validateFields = () => {
    const newErrors = {
      email: !email.trim() || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim()),
      otp: !otp.trim() || otp.trim().length !== 6,
      newPassword: !newPassword || newPassword.length < 6,
      confirmPassword: !confirmPassword || newPassword !== confirmPassword
    };
    
    setErrors(newErrors);
    
    const hasError = Object.values(newErrors).some(val => val === true);
    return !hasError;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const isValid = validateFields();

    if (!isValid) {
      setShakeFields(true);
      setTimeout(() => setShakeFields(false), 1000);
      
      if (errors.email) {
        showToast('Vui lòng nhập Email hợp lệ!', 'error');
      } else if (errors.otp) {
        showToast('Mã OTP phải có độ dài đúng 6 ký tự!', 'error');
      } else if (errors.newPassword) {
        showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
      } else if (errors.confirmPassword) {
        showToast('Xác nhận mật khẩu mới không khớp!', 'error');
      } else {
        showToast('Vui lòng điền đầy đủ và đúng thông tin!', 'error');
      }
      return;
    }

    setLoading(true);

    fetch('http://localhost:5000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        otp: otp.trim(),
        newPassword: newPassword
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoading(false);
        if (status === 200) {
          navigate('/login');
        } else {
          showToast(data.message || 'Mã OTP không hợp lệ hoặc đã hết hạn!', 'error');
        }
      })
      .catch(err => {
        setLoading(false);
        showToast('Không thể kết nối đến máy chủ Backend!', 'error');
      });
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
      <section className="form-column" aria-label="Biểu mẫu đặt lại mật khẩu" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className={`forgot-card ${shakeFields ? 'shake' : ''}`}>
          {/* Badge Header */}
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

          {/* Form */}
          <form id="reset-password-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Email Field */}
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: false }));
                  }}
                />
                <label>Email đăng ký</label>
              </div>
              <span className="error-message">Vui lòng nhập email hợp lệ</span>
            </div>

            {/* OTP Field */}
            <div className={`input-group ${errors.otp ? 'invalid' : ''}`} style={{ marginBottom: '0px' }}>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </span>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder=" " 
                  required 
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/[^0-9]/g, ''));
                    setErrors(prev => ({ ...prev, otp: false }));
                  }}
                />
                <label>Mã xác minh OTP (6 số)</label>
              </div>
              <span className="error-message">Mã OTP phải có đúng 6 chữ số</span>
            </div>

            {/* New Password Field */}
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
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrors(prev => ({ ...prev, newPassword: false }));
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
              <span className="error-message">Mật khẩu mới phải có tối thiểu 6 ký tự</span>
            </div>

            {/* Confirm Password Field */}
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
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors(prev => ({ ...prev, confirmPassword: false }));
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

            {/* Submit Button */}
            <button 
              type="submit" 
              id="reset-btn" 
              className="primary-button"
              disabled={loading}
              style={{ marginTop: '4px', height: '46px' }}
            >
              {loading ? (
                <span className="btn-spinner"></span>
              ) : (
                <span className="btn-text">Xác minh OTP & Đặt lại mật khẩu</span>
              )}
            </button>

            {/* Back Navigation Link */}
            <Link to="/forgot" className="back-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Quay lại trang gửi OTP</span>
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

export default ResetPassword;
