import React, { useState } from 'react';
import OtpInput from '../OtpInput';
import { requestEmailChange, confirmEmailChange } from '../../services/identityApi';
import { dispatchAuthChanged } from '../../utils/authEvents';

const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Đổi email đăng nhập — hai bước.
 * Bước 1 nhập email mới + mật khẩu hiện tại; bước 2 nhập cả hai mã OTP (một gửi
 * tới hòm thư cũ, một gửi tới hòm thư mới) để chứng minh sở hữu cả hai địa chỉ.
 */
const ProfileEmailSection = ({ showToast, idPrefix = 'profile', currentEmail = '', onChanged }) => {
  const isGoogleLogin = localStorage.getItem('loginMethod') === 'google';
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ newEmail: '', currentPassword: '' });
  const [otpCurrent, setOtpCurrent] = useState('');
  const [otpNew, setOtpNew] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const panelId = `${idPrefix}-email-panel`;

  const resetAll = () => {
    setStep('form');
    setForm({ newEmail: '', currentPassword: '' });
    setOtpCurrent('');
    setOtpNew('');
    setPendingEmail('');
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!form.newEmail.trim() || !form.currentPassword) {
      showToast?.('Vui lòng nhập email mới và mật khẩu hiện tại.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await requestEmailChange(form.newEmail.trim(), form.currentPassword);
      setPendingEmail(res.newEmail || form.newEmail.trim());
      setStep('otp');
      setForm((p) => ({ ...p, currentPassword: '' }));
      showToast?.(res.message || 'Đã gửi mã xác minh.', 'success');
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (otpCurrent.length !== 6 || otpNew.length !== 6) {
      showToast?.('Vui lòng nhập đủ cả hai mã xác minh.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await confirmEmailChange(otpCurrent, otpNew);

      // Token cũ mang email cũ nên không còn dùng được — thay ngay bằng token mới
      // server vừa cấp, cùng lúc với userEmail để không có khoảng lệch.
      if (res.token) localStorage.setItem('authToken', res.token);
      if (res.user?.email) localStorage.setItem('userEmail', res.user.email);
      dispatchAuthChanged();

      resetAll();
      setOpen(false);
      showToast?.(res.message || 'Đã đổi email đăng nhập.', 'success');
      onChanged?.(res.user);
    } catch (err) {
      setOtpCurrent('');
      setOtpNew('');
      showToast?.(err.message, 'error');
      if (err.status === 400 && /không tìm thấy yêu cầu/i.test(err.message)) resetAll();
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ctsv-profile-security-card">
      <button
        type="button"
        className="ctsv-profile-security-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="ctsv-profile-security-toggle-main">
          <h2>Đổi email đăng nhập</h2>
          <p>{currentEmail ? `Hiện tại: ${currentEmail}` : 'Thay đổi địa chỉ email dùng để đăng nhập.'}</p>
        </div>
        <span className={`ctsv-profile-security-chevron${open ? ' is-open' : ''}`} aria-hidden>
          <IconChevronDown />
        </span>
      </button>

      <div id={panelId} className={`ctsv-profile-security-panel${open ? ' is-open' : ''}`}>
        <div className="ctsv-profile-security-panel-inner">
          <div className="ctsv-profile-security-body">
            {isGoogleLogin ? (
              <p className="ctsv-profile-security-note">
                Tài khoản đăng nhập bằng Google không thể đổi email tại đây, vì email chính là định danh
                Google của bạn.
              </p>
            ) : step === 'form' ? (
              <form className="ctsv-profile-password-form" onSubmit={handleRequest}>
                <p className="ctsv-profile-security-note">
                  Để bảo mật, chúng tôi sẽ gửi mã xác minh tới <strong>cả email hiện tại và email mới</strong>.
                  Bạn cần nhập đúng cả hai mã.
                </p>
                <div className="profile-form-grid">
                  <div className="profile-input-group profile-form-grid-full">
                    <label htmlFor={`${idPrefix}-new-email`}>Email mới</label>
                    <input
                      id={`${idPrefix}-new-email`}
                      type="email"
                      placeholder="email.moi@example.com"
                      value={form.newEmail}
                      onChange={(e) => setForm((p) => ({ ...p, newEmail: e.target.value }))}
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                  <div className="profile-input-group profile-form-grid-full">
                    <label htmlFor={`${idPrefix}-email-password`}>Mật khẩu hiện tại</label>
                    <input
                      id={`${idPrefix}-email-password`}
                      type="password"
                      placeholder="Xác minh danh tính của bạn"
                      value={form.currentPassword}
                      onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      autoComplete="current-password"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="ctsv-profile-security-actions">
                  <button type="submit" className="primary-button btn-save-profile" disabled={loading}>
                    {loading ? 'Đang gửi mã...' : 'Gửi mã xác minh'}
                  </button>
                </div>
              </form>
            ) : (
              <form className="ctsv-profile-password-form" onSubmit={handleConfirm}>
                <p className="ctsv-profile-security-note">
                  Nhập mã đã gửi tới <strong>{currentEmail}</strong> và <strong>{pendingEmail}</strong>.
                  Mã có hiệu lực 10 phút.
                </p>

                <div className="identity-otp-group">
                  <label>Mã gửi tới email hiện tại</label>
                  <OtpInput
                    value={otpCurrent}
                    onChange={setOtpCurrent}
                    disabled={loading}
                    idPrefix={`${idPrefix}-otp-old`}
                  />
                </div>

                <div className="identity-otp-group">
                  <label>Mã gửi tới email mới</label>
                  <OtpInput
                    value={otpNew}
                    onChange={setOtpNew}
                    disabled={loading}
                    idPrefix={`${idPrefix}-otp-new`}
                  />
                </div>

                <div className="ctsv-profile-security-actions">
                  <button type="submit" className="primary-button btn-save-profile" disabled={loading}>
                    {loading ? 'Đang xác minh...' : 'Xác nhận đổi email'}
                  </button>
                  <button
                    type="button"
                    className="ctsv-profile-security-cancel"
                    onClick={resetAll}
                    disabled={loading}
                  >
                    Hủy
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

export default ProfileEmailSection;
