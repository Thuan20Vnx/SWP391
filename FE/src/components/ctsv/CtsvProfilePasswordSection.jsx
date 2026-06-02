import React, { useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../utils/api';

const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EMPTY_PW = { currentPassword: '', newPassword: '', confirmPassword: '' };

const CtsvProfilePasswordSection = ({ showToast }) => {
  const isGoogleLogin = localStorage.getItem('loginMethod') === 'google';
  const [open, setOpen] = useState(false);
  const [pwForm, setPwForm] = useState(EMPTY_PW);
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast?.('Vui lòng điền đầy đủ thông tin mật khẩu.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast?.('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast?.('Xác nhận mật khẩu không khớp.', 'error');
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/user/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200) {
          setPwForm(EMPTY_PW);
          showToast?.('Đổi mật khẩu thành công.', 'success');
        } else {
          showToast?.(data.message || 'Đổi mật khẩu thất bại.', 'error');
        }
      })
      .catch(() => showToast?.('Không thể kết nối máy chủ.', 'error'))
      .finally(() => setLoading(false));
  };

  return (
    <section className="ctsv-profile-security-card">
      <button
        type="button"
        className="ctsv-profile-security-toggle"
        aria-expanded={open}
        aria-controls="ctsv-profile-password-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="ctsv-profile-security-toggle-main">
          <h2>Đổi mật khẩu</h2>
          <p>Cập nhật mật khẩu đăng nhập tài khoản cán bộ CTSV.</p>
        </div>
        <span className={`ctsv-profile-security-chevron${open ? ' is-open' : ''}`} aria-hidden>
          <IconChevronDown />
        </span>
      </button>

      <div
        id="ctsv-profile-password-panel"
        className={`ctsv-profile-security-panel${open ? ' is-open' : ''}`}
      >
        <div className="ctsv-profile-security-panel-inner">
          <div className="ctsv-profile-security-body">
            {isGoogleLogin ? (
              <p className="ctsv-profile-security-note">
                Tài khoản đăng nhập bằng Google không hỗ trợ đổi mật khẩu tại đây.
              </p>
            ) : (
              <form className="ctsv-profile-password-form" onSubmit={handlePasswordSubmit}>
                <div className="profile-input-group">
                  <label htmlFor="ctsv-current-password">Mật khẩu hiện tại</label>
                  <input
                    id="ctsv-current-password"
                    type="password"
                    placeholder="Nhập mật khẩu hiện tại"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
                <div className="profile-form-grid">
                  <div className="profile-input-group">
                    <label htmlFor="ctsv-new-password">Mật khẩu mới</label>
                    <input
                      id="ctsv-new-password"
                      type="password"
                      placeholder="Ít nhất 6 ký tự"
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>
                  <div className="profile-input-group">
                    <label htmlFor="ctsv-confirm-password">Xác nhận mật khẩu</label>
                    <input
                      id="ctsv-confirm-password"
                      type="password"
                      placeholder="Nhập lại mật khẩu mới"
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="ctsv-profile-security-actions">
                  <button type="submit" className="primary-button btn-save-profile" disabled={loading}>
                    {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtsvProfilePasswordSection;
