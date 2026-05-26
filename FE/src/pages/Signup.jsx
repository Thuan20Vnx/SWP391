import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import fptLogo from '../assets/fpt_logo.png';

const patterns = {
  fullname: /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơư\s]{5,50}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^0[3|5|7|8|9][0-9]{8}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

const Signup = ({ showToast }) => {
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

    const isValid = patterns.email.test(value.trim());
    const isFptEmail = value.trim().toLowerCase().endsWith('@fpt.edu.vn') || value.trim().toLowerCase().endsWith('@fe.edu.vn');
    
    setErrors(prev => ({ ...prev, email: !isValid }));
    setValidFields(prev => ({ ...prev, email: isValid }));

    // Custom warning for FPT Student Email format
    const errorSpan = document.getElementById('error-email');
    if (errorSpan) {
      if (isValid && !isFptEmail) {
        errorSpan.textContent = "Hệ thống khuyên dùng email FPT (@fpt.edu.vn)";
        errorSpan.style.color = "var(--primary)";
      } else {
        errorSpan.textContent = "Vui lòng nhập email hợp lệ (ví dụ: student@fpt.edu.vn)";
        errorSpan.style.color = "var(--border-error)";
      }
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

      showToast('Vui lòng kiểm tra lại các trường thông tin lỗi!', 'error');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      showToast(`Đăng ký thành công! Chào mừng ${formData.fullname.trim()} gia nhập FPT Students Community.`, 'success');
      
      // Reset form
      setFormData({
        fullname: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        terms: false
      });
      setErrors({});
      setValidFields({});
    }, 1800);
  };

  const handleSsoClick = (provider) => {
    showToast(`Đang kết nối tài khoản ${provider}...`, 'success');
  };

  const getGroupClass = (name) => {
    return `input-group ${errors[name] ? 'invalid' : ''} ${validFields[name] ? 'valid' : ''} ${shakeFields[name] ? 'shake' : ''}`;
  };

  return (
    <main className="page-container">
      {/* Left Column: Branding (40%) */}
      <section className="branding-column" aria-label="Giới thiệu cộng đồng FPT">
        <div className="glass-overlay"></div>
        <div className="branding-content">
          {/* Logo */}
          <div className="logo-container">
            <img className="fpt-logo" src={fptLogo} alt="FPT Logo" />
          </div>
          {/* Slogans */}
          <div className="slogan-container">
            <p className="slogan-tag">Kiến tạo tương lai</p>
            <p className="slogan-desc">Kết nối hàng ngàn sinh viên thông qua những sự kiện công nghệ và văn hóa hàng đầu tại FPT.</p>
          </div>
        </div>
      </section>

      {/* Right Column: Signup Form (60%) */}
      <section className="form-column" aria-label="Biểu mẫu đăng ký tài khoản">
        <div className="form-container">
          {/* Header */}
          <header className="form-header">
            <h1 id="main-title">Tạo tài khoản mới</h1>
            <p className="subtitle">Tham gia cộng đồng sự kiện lớn nhất tại FPT</p>
          </header>

          {/* Main Form */}
          <form id="signup-form" onSubmit={handleSubmit} noValidate>
            
            {/* Full Name Field */}
            <div className={getGroupClass('fullname')} id="group-fullname">
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
            <div className={getGroupClass('email')} id="group-email">
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
              <span className="error-message" id="error-email">Vui lòng nhập email hợp lệ (ví dụ: student@fpt.edu.vn)</span>
            </div>

            {/* Phone Number Field */}
            <div className={getGroupClass('phone')} id="group-phone">
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
            <div className={getGroupClass('password')} id="group-password">
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
            <div className={getGroupClass('confirmPassword')} id="group-confirm-password">
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
            <div className={`checkbox-group ${errors.terms ? 'invalid' : ''} ${shakeFields.terms ? 'shake' : ''}`}>
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
            <button type="submit" id="signup-btn" className="primary-button" disabled={loading}>
              {loading ? (
                <span className="btn-spinner"></span>
              ) : (
                <span className="btn-text">Đăng ký</span>
              )}
            </button>
          </form>

          {/* Footer / Login Redirection */}
          <footer className="form-footer">
            <p className="login-redirect">Đã có tài khoản? <Link to="/login" id="login-link" className="accent-link">Đăng nhập ngay</Link></p>
            
            {/* SSO Section */}
            <div className="sso-divider">
              <span>HOẶC ĐĂNG KÝ BẰNG</span>
            </div>

            <div className="sso-buttons">
              {/* Google SSO */}
              <button type="button" id="google-login" className="sso-button" onClick={() => handleSsoClick('Google')}>
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </button>
              
              {/* Microsoft SSO */}
              <button type="button" id="microsoft-login" className="sso-button" onClick={() => handleSsoClick('Microsoft FPT')}>
                <svg width="20" height="20" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="10.5" height="10.5" fill="#F25022"/>
                  <rect x="11.5" y="0" width="10.5" height="10.5" fill="#7FBA00"/>
                  <rect x="0" y="11.5" width="10.5" height="10.5" fill="#00A1F1"/>
                  <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#FFB900"/>
                </svg>
                <span>FPT Mail</span>
              </button>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
};

export default Signup;
