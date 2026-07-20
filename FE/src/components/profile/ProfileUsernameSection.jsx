import React, { useEffect, useState } from 'react';
import OtpInput from '../OtpInput';
import { requestUsernameChange, confirmUsernameChange } from '../../services/identityApi';
import { API_BASE, getAuthHeaders } from '../../utils/api';

const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const USERNAME_HINT = 'Từ 4-20 ký tự, bắt đầu bằng chữ cái, chỉ gồm chữ thường, số, dấu chấm và gạch dưới.';

/**
 * Đổi tên đăng nhập — hai bước, xác minh bằng OTP gửi tới email của tài khoản.
 * Tài khoản chưa đặt mật khẩu thì bỏ qua ô mật khẩu, chỉ dùng OTP.
 *
 * Điều kiện phải là "đã có mật khẩu chưa", không phải "đăng nhập bằng Google":
 * người dùng Google có thể tự tạo mật khẩu ở mục Đổi mật khẩu, và khi đó máy chủ
 * (identityChange.service — `if (user.passwordHash) assertPassword(...)`) sẽ bắt
 * buộc nhập mật khẩu. Bám theo loginMethod sẽ ẩn mất ô và request luôn hỏng 400.
 */
const ProfileUsernameSection = ({ showToast, idPrefix = 'profile', currentUsername = '', onChanged }) => {
  const [hasPassword, setHasPassword] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (alive && data?.user) setHasPassword(Boolean(data.user.hasPassword));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ newUsername: '', currentPassword: '' });
  const [otp, setOtp] = useState('');
  const [pendingUsername, setPendingUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const panelId = `${idPrefix}-username-panel`;

  const resetAll = () => {
    setStep('form');
    setForm({ newUsername: '', currentPassword: '' });
    setOtp('');
    setPendingUsername('');
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!form.newUsername.trim()) {
      showToast?.('Vui lòng nhập tên đăng nhập mới.', 'error');
      return;
    }
    if (hasPassword && !form.currentPassword) {
      showToast?.('Vui lòng nhập mật khẩu hiện tại.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await requestUsernameChange(form.newUsername.trim().toLowerCase(), form.currentPassword);
      setPendingUsername(res.newUsername || form.newUsername.trim().toLowerCase());
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
    if (otp.length !== 6) {
      showToast?.('Vui lòng nhập đủ 6 số của mã xác minh.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await confirmUsernameChange(otp);
      resetAll();
      setOpen(false);
      showToast?.(res.message || 'Đã đổi tên đăng nhập.', 'success');
      onChanged?.(res.user);
    } catch (err) {
      setOtp('');
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
          <h2>Đổi tên đăng nhập</h2>
          <p>
            {currentUsername
              ? `Hiện tại: ${currentUsername}`
              : 'Tài khoản chưa có tên đăng nhập. Đặt một tên để đăng nhập nhanh hơn.'}
          </p>
        </div>
        <span className={`ctsv-profile-security-chevron${open ? ' is-open' : ''}`} aria-hidden>
          <IconChevronDown />
        </span>
      </button>

      <div id={panelId} className={`ctsv-profile-security-panel${open ? ' is-open' : ''}`}>
        <div className="ctsv-profile-security-panel-inner">
          <div className="ctsv-profile-security-body">
            {step === 'form' ? (
              <form className="ctsv-profile-password-form" onSubmit={handleRequest}>
                <p className="ctsv-profile-security-note">
                  Chúng tôi sẽ gửi mã xác minh tới email của bạn. Mỗi tài khoản chỉ đổi tên đăng nhập
                  được một lần trong 30 ngày.
                </p>
                <div className="profile-form-grid">
                  <div className="profile-input-group profile-form-grid-full">
                    <label htmlFor={`${idPrefix}-new-username`}>Tên đăng nhập mới</label>
                    <input
                      id={`${idPrefix}-new-username`}
                      type="text"
                      placeholder="vd: thuan.vnx"
                      value={form.newUsername}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, newUsername: e.target.value.trim().toLowerCase() }))
                      }
                      autoComplete="username"
                      disabled={loading}
                    />
                    <span className="identity-field-hint">{USERNAME_HINT}</span>
                  </div>
                  {hasPassword && (
                    <div className="profile-input-group profile-form-grid-full">
                      <label htmlFor={`${idPrefix}-username-password`}>Mật khẩu hiện tại</label>
                      <input
                        id={`${idPrefix}-username-password`}
                        type="password"
                        placeholder="Xác minh danh tính của bạn"
                        value={form.currentPassword}
                        onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
                        autoComplete="current-password"
                        disabled={loading}
                      />
                    </div>
                  )}
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
                  Nhập mã đã gửi tới email của bạn để đổi tên đăng nhập thành{' '}
                  <strong>{pendingUsername}</strong>. Mã có hiệu lực 10 phút.
                </p>

                <div className="identity-otp-group">
                  <label>Mã xác minh</label>
                  <OtpInput value={otp} onChange={setOtp} disabled={loading} idPrefix={`${idPrefix}-otp-un`} />
                </div>

                <div className="ctsv-profile-security-actions">
                  <button type="submit" className="primary-button btn-save-profile" disabled={loading}>
                    {loading ? 'Đang xác minh...' : 'Xác nhận đổi tên'}
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

export default ProfileUsernameSection;
