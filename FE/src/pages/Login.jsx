import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fptLogo from '../assets/fpt_logo.png';

const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
};

const Login = ({ showToast }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [validFields, setValidFields] = useState({});
  const [shakeFields, setShakeFields] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    let alertTimeout;
    if (showAlert) {
      alertTimeout = setTimeout(() => {
        setShowAlert(false);
      }, 3000);
    }
    return () => {
      if (alertTimeout) clearTimeout(alertTimeout);
    };
  }, [showAlert]);

  const validateField = (name, value) => {
    let isValid = false;

    if (name === 'email') {
      isValid = patterns.email.test(value.trim());
    } else if (name === 'password') {
      isValid = value.trim().length >= 8;
    }

    setErrors(prev => ({ ...prev, [name]: !isValid }));
    setValidFields(prev => ({ ...prev, [name]: isValid }));

    return isValid;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    setShowAlert(false); // Hide general alert when typing again
    validateField(id, value);

    if (id === 'password') {
      // Reset password error message back to default rules helper
      const errorMsg = document.getElementById('error-password');
      if (errorMsg) errorMsg.textContent = "Mật khẩu phải từ 8 ký tự trở lên";
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, email: value }));
    setShowAlert(false);

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
        errorSpan.textContent = "Vui lòng nhập email hợp lệ";
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

    const isEmailValid = validateField('email', formData.email);
    const isPasswordValid = validateField('password', formData.password);

    const isFormValid = isEmailValid && isPasswordValid;

    if (!isFormValid) {
      if (!isEmailValid) triggerShake('email');
      if (!isPasswordValid) triggerShake('password');
      return;
    }

    setLoading(true);
    setShowAlert(false);

    setTimeout(() => {
      setLoading(false);

      if (formData.email === 'admin@fpt.edu.vn' && formData.password === 'AdminPassword123!') {
        showToast('Đăng nhập thành công! Chào mừng bạn quay trở lại FPT Students Community.', 'success');
        
        // Save mock login state in localStorage so Profile can read it if needed
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', formData.email);

        navigate('/profile');
      } else {
        setShowAlert(true);
        setValidFields(prev => ({ ...prev, password: false }));
        setErrors(prev => ({ ...prev, password: true }));

        const errorSpan = document.getElementById('error-password');
        if (errorSpan) {
          errorSpan.textContent = "Mật khẩu không chính xác. Vui lòng thử lại.";
        }

        triggerShake('password');
      }
    }, 1500);
  };

  const handleSsoClick = (provider) => {
    showToast(`Đang kết nối tài khoản ${provider}...`, 'success');
  };

  const getGroupClass = (name) => {
    return `input-group ${errors[name] ? 'invalid' : ''} ${validFields[name] ? 'valid' : ''} ${shakeFields[name] ? 'shake' : ''}`;
  };

  return (
    <main className="page-container split-50">
      {/* Left Column: Branding (50%) */}
      <section className="branding-column" aria-label="Giới thiệu cộng đồng FPT">
        <div className="glass-overlay"></div>
        <div className="branding-content">
          <div className="slogan-container login-slogan">
            <h2 className="slogan-title">Kết nối tri thức,<br />Kiến tạo tương lai.</h2>
            <p className="slogan-desc">Tham gia vào hệ sinh thái sự kiện công nghệ và giáo dục hàng đầu dành cho cộng đồng FPT.</p>
          </div>
        </div>
      </section>

      {/* Right Column: Login Form (50%) */}
      <section className="form-column" aria-label="Biểu mẫu đăng nhập tài khoản">
        <div className="form-container">
          {/* Inline Error Alert Banner */}
          <div id="login-alert" className={`alert-banner ${showAlert ? '' : 'hidden'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Lỗi: Tài khoản hoặc mật khẩu không đúng!</span>
            <button type="button" id="close-alert" className="alert-close" onClick={() => setShowAlert(false)} aria-label="Đóng thông báo">&times;</button>
          </div>

          {/* Header */}
          <header className="form-header" style={{ textAlign: 'center', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="logo-container" style={{ marginBottom: '16px' }}>
              <img className="fpt-logo" src={fptLogo} alt="FPT Logo" />
            </div>
            <h1 id="main-title" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>Chào mừng trở lại</h1>
            <p className="subtitle" style={{ fontSize: '1rem', color: 'var(--color-icon)' }}>Đăng nhập để tiếp tục khám phá</p>
          </header>

          {/* SSO Section */}
          <div className="sso-section-vertical">
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <p className="sso-subtext">Dành cho sinh viên, cán bộ FPT</p>
              <button type="button" id="feid-login" className="sso-button feid-button" onClick={() => handleSsoClick('FeID')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path>
                </svg>
                <span>Đăng nhập với FeID</span>
              </button>
            </div>

            <button type="button" id="google-login" className="sso-button google-button" onClick={() => handleSsoClick('Google')}>
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Đăng nhập với Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="sso-divider login-divider">
            <span>Hoặc sử dụng tài khoản cá nhân</span>
          </div>

          {/* Manual Login Form */}
          <form id="login-form" onSubmit={handleSubmit} noValidate>
            
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
                <label htmlFor="email">Email của bạn</label>
              </div>
              <span className="error-message" id="error-email">Vui lòng nhập email hợp lệ</span>
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
                  autoComplete="current-password"
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
              <span className="error-message" id="error-password">Mật khẩu phải từ 8 ký tự trở lên</span>
            </div>

            {/* Forgot Password Link */}
            <div className="forgot-password-container">
              <Link to="/forgot" id="forgot-link" className="accent-link dark">Quên mật khẩu?</Link>
            </div>

            {/* Submit Button */}
            <button type="submit" id="login-btn" className="primary-button" style={{ marginTop: '16px' }} disabled={loading}>
              {loading ? (
                <span className="btn-spinner"></span>
              ) : (
                <span className="btn-text">Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Footer / Redirect */}
          <footer className="form-footer" style={{ marginTop: '24px' }}>
            <p className="login-redirect">
              <span style={{ color: 'var(--color-icon)' }}>Chưa có tài khoản? </span>
              <Link to="/signup" id="signup-link" className="accent-link dark">Đăng ký ngay</Link>
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
};

export default Login;
