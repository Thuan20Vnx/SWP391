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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth_status');
    if (authStatus === 'success') {
      const email = params.get('email');
      const name = params.get('name');

      showToast(`Đăng nhập Google thành công! Chào mừng ${name}.`, 'success');
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('loginMethod', 'google');

      // Save this real account to googleAccounts in localStorage so it appears in the chooser list next time
      const saved = localStorage.getItem('googleAccounts');
      let accounts = saved ? JSON.parse(saved) : [];
      if (!accounts.some(acc => acc.email.toLowerCase() === email.toLowerCase())) {
        accounts.push({ email: email.toLowerCase(), name: name });
        localStorage.setItem('googleAccounts', JSON.stringify(accounts));
      }

      navigate('/profile', { replace: true });
    } else if (authStatus === 'error') {
      const message = params.get('message') || 'Đăng nhập Google thất bại.';
      showToast(message, 'error');
      navigate('/login', { replace: true });
    }
  }, [navigate, showToast]);

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

    fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password
      })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoading(false);
        if (status === 200) {
          showToast('Đăng nhập thành công! Chào mừng bạn quay trở lại FPT Students Community.', 'success');

          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userEmail', formData.email);
          localStorage.setItem('loginMethod', 'local');

          navigate('/profile');
        } else {
          setShowAlert(true);
          setValidFields(prev => ({ ...prev, password: false }));
          setErrors(prev => ({ ...prev, password: true }));

          const errorSpan = document.getElementById('error-password');
          if (errorSpan) {
            errorSpan.textContent = data.message || "Tài khoản hoặc mật khẩu không chính xác.";
          }

          triggerShake('password');
        }
      })
      .catch(err => {
        setLoading(false);
        showToast('Không thể kết nối đến máy chủ Backend!', 'error');
      });
  };

  const handleSsoClick = (provider) => {
    showToast(`Đang kết nối tài khoản ${provider}...`, 'success');
  };

  const loginWithGoogle = () => {
    const params = new URLSearchParams({
      client_id: "462966212822-ohmu33pmrp4dcpuq3hm00tnvuac4jqa9.apps.googleusercontent.com",
      redirect_uri: "http://localhost:5000/api/auth/google/callback",
      response_type: "code",
      scope: "openid email profile",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
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
            <h2 className="slogan-title" style={{ fontSize: '3rem', fontWeight: 800, lineHeight: '60px', color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '16px' }}>
              Kết nối tri thức,<br />Kiến tạo tương lai.
            </h2>
            <p className="slogan-desc" style={{ fontSize: '1.25rem', fontWeight: 400, lineHeight: '32.5px', color: '#ffffff' }}>
              Tham gia vào hệ sinh thái sự kiện công nghệ và giáo dục hàng đầu dành cho cộng đồng FPT.
            </p>
          </div>
        </div>
      </section>

      {/* Right Column: Login Form (50%) */}
      <section className="form-column" aria-label="Biểu mẫu đăng nhập tài khoản">
        <div className="form-container" style={{ width: '100%', maxWidth: '420px' }}>
          {/* Inline Error Alert Banner */}
          <div id="login-alert" className={`alert-banner ${showAlert ? '' : 'hidden'}`} style={{ marginBottom: '24px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Lỗi: Tài khoản hoặc mật khẩu không đúng!</span>
            <button type="button" id="close-alert" className="alert-close" onClick={() => setShowAlert(false)} aria-label="Đóng thông báo">&times;</button>
          </div>

          {/* Logo F-Events */}
          <div className="login-logo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0px' }}>
            <img
              src="https://lh3.googleusercontent.com/d/1zQNsDmGHl1ho4Xk8SN6dOPXSQVQQbhWM"
              alt="F-Events Logo"
              style={{ width: '115px', height: '64px', objectFit: 'contain' }}
            />
          </div>

          {/* Header */}
          <header className="form-header" style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h1 id="main-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Chào mừng trở lại</h1>
            {/* <p className="subtitle" style={{ fontSize: '0.9rem', color: '#64748b' }}>Đăng nhập để tiếp tục khám phá</p> */}
          </header>

          {/* SSO Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* <button
              type="button"
              id="feid-login"
              className="feid-button-custom"
              onClick={() => handleSsoClick('FeID')}
              style={{ height: '46px', border: '2px solid #F26F21' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path>
              </svg>

            </button> */}
            <p className="sso-subtext-custom" style={{ marginTop: '0px', marginBottom: '0px' }}>Dành cho sinh viên, cán bộ FPT</p>

            <button
              type="button"
              id="google-login"
              className="google-button-custom"
              onClick={loginWithGoogle}
              style={{ height: '44px', border: '1px solid #e0c0b2' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Đăng nhập với Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="login-divider-custom">
            <span>Hoặc sử dụng tài khoản cá nhân</span>
          </div>

          {/* Manual Login Form */}
          <form id="login-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

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
                <label htmlFor="email">Email của bạn</label>
              </div>
              <span className="error-message" id="error-email">Vui lòng nhập email hợp lệ</span>
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
            <div className="forgot-password-container" style={{ marginTop: '-8px' }}>
              <Link to="/forgot" id="forgot-link" className="accent-link" style={{ color: 'var(--primary)', fontWeight: '600' }}>Quên mật khẩu?</Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-btn"
              className="primary-button"
              style={{ marginTop: '0px', height: '46px' }}
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner"></span>
              ) : (
                <span className="btn-text">Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Footer / Redirect */}
          <footer className="form-footer" style={{ marginTop: '10px', textAlign: 'center' }}>
            <p className="login-redirect" style={{ fontSize: '0.95rem' }}>
              <span style={{ color: '#584238' }}>Chưa có tài khoản? </span>
              <Link to="/signup" id="signup-link" className="accent-link" style={{ color: '#a04100', fontWeight: '700' }}>Đăng ký ngay</Link>
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
};

export default Login;
