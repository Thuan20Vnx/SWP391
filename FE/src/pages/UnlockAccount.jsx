import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import fptLogo from '../assets/fpt_logo.png';
import { API_BASE } from '../utils/api';

const UnlockAccount = ({ showToast }) => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Liên kết mở khóa không hợp lệ.');
      return undefined;
    }

    const controller = new AbortController();

    fetch(`${API_BASE}/api/auth/unlock-account?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus('success');
          setMessage(data.message || 'Tài khoản đã được mở khóa.');
          showToast?.('Tài khoản đã được mở khóa.', 'success');
          return;
        }
        setStatus('error');
        setMessage(data.message || 'Không thể mở khóa tài khoản.');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setStatus('error');
        setMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      });

    return () => controller.abort();
  }, [token, showToast]);

  return (
    <main className="page-container split-50">
      <section className="branding-column" aria-label="Giới thiệu F-Events">
        <div className="glass-overlay" />
        <div className="branding-content">
          <div className="slogan-container login-slogan">
            <h2 className="slogan-title">Bảo mật tài khoản</h2>
            <p className="slogan-desc">Mở khóa tài khoản sau cảnh báo đăng nhập bất thường.</p>
          </div>
        </div>
      </section>

      <section className="form-column" aria-label="Mở khóa tài khoản">
        <div className="auth-form-shell">
          <Link to="/login" className="auth-page-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Quay lại đăng nhập</span>
          </Link>

          <div className="form-container" style={{ width: '100%' }}>
            <div className="login-logo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0px' }}>
              <img src={fptLogo} alt="F-Events Logo" style={{ width: '115px', height: '64px', objectFit: 'contain' }} />
            </div>

            <header className="form-header" style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                {status === 'loading' ? 'Đang xử lý...' : status === 'success' ? 'Mở khóa thành công' : 'Không thể mở khóa'}
              </h1>
            </header>

            {status === 'loading' && (
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>
                Vui lòng chờ trong giây lát...
              </p>
            )}

            {status !== 'loading' && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: status === 'success' ? '#ecfdf3' : '#fff3f3',
                  color: status === 'success' ? '#027a48' : '#b42318',
                  fontSize: '14px',
                  lineHeight: 1.55,
                  textAlign: 'center',
                }}
              >
                {message}
              </div>
            )}

            {status === 'success' && (
              <Link
                to="/login"
                className="btn-primary"
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
              >
                Đăng nhập ngay
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default UnlockAccount;
