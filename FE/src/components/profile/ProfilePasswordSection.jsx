import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OtpInput from '../OtpInput';
import { API_BASE, getAuthHeaders } from '../../utils/api';
import { requestPasswordSetup, confirmPasswordSetup } from '../../services/identityApi';

const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EMPTY_PW = { currentPassword: '', newPassword: '', confirmPassword: '' };
const USERNAME_HINT = 'Từ 4-20 ký tự, bắt đầu bằng chữ cái, chỉ gồm chữ thường, số, dấu chấm và gạch dưới.';

/**
 * Đổi mật khẩu, hoặc TẠO mật khẩu đầu tiên cho tài khoản đăng nhập bằng Google.
 *
 * Luồng tạo đi qua OTP gửi về email (hai bước) vì đặt mật khẩu lần đầu biến một
 * phiên đăng nhập tạm thời thành lối vào lâu dài. Luồng đổi giữ nguyên một bước,
 * đã tự xác thực bằng mật khẩu hiện tại.
 *
 * Tài khoản Google thường chưa có tên đăng nhập nên cho đặt luôn ở đây, tránh phải
 * đi tiếp qua luồng đổi tên đăng nhập (vốn đòi mật khẩu hiện tại) ngay sau đó.
 */
const ProfilePasswordSection = ({
  showToast,
  description = 'Cập nhật mật khẩu đăng nhập tài khoản của bạn.',
  idPrefix = 'profile',
}) => {
  const [open, setOpen] = useState(false);
  const [pwForm, setPwForm] = useState(EMPTY_PW);
  const [newUsername, setNewUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  // null = chưa biết. Tránh nhấp nháy nhãn khi hồ sơ chưa về.
  const [hasPassword, setHasPassword] = useState(null);
  const [hasUsername, setHasUsername] = useState(true);
  const [email, setEmail] = useState('');
  const panelId = `${idPrefix}-password-panel`;

  // Nguồn sự thật là hồ sơ từ máy chủ, không phải loginMethod trong localStorage:
  // người dùng Google sau khi tạo mật khẩu vẫn có loginMethod = 'google'.
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!alive || !data?.user) return;
        setHasPassword(Boolean(data.user.hasPassword));
        setHasUsername(Boolean(data.user.username));
        setEmail(data.user.email || '');
      })
      .catch(() => {
        // Không đọc được thì coi như đã có mật khẩu — form đầy đủ vẫn dùng được,
        // còn máy chủ mới là bên quyết định cuối cùng.
        if (alive) setHasPassword(true);
      });
    return () => { alive = false; };
  }, []);

  const isCreating = hasPassword === false;
  const heading = isCreating ? 'Tạo mật khẩu mới' : 'Đổi mật khẩu';
  const panelDescription = isCreating
    ? 'Tài khoản Google của bạn chưa có mật khẩu. Tạo mật khẩu để đăng nhập được bằng cả hai cách.'
    : description;

  const resetAll = () => {
    setPwForm(EMPTY_PW);
    setNewUsername('');
    setOtp('');
    setStep('form');
  };

  const validatePair = () => {
    const { newPassword, confirmPassword } = pwForm;
    if (newPassword.length < 6) {
      showToast?.('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return false;
    }
    if (newPassword !== confirmPassword) {
      showToast?.('Xác nhận mật khẩu không khớp.', 'error');
      return false;
    }
    return true;
  };

  /** Luồng đổi mật khẩu (đã có mật khẩu) — một bước. */
  const handleChangeSubmit = (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast?.('Vui lòng điền đầy đủ thông tin mật khẩu.', 'error');
      return;
    }
    if (!validatePair()) return;

    setLoading(true);
    fetch(`${API_BASE}/api/user/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200) {
          resetAll();
          showToast?.(data.message || 'Đổi mật khẩu thành công.', 'success');
        } else {
          showToast?.(data.message || 'Đổi mật khẩu thất bại.', 'error');
        }
      })
      .catch(() => showToast?.('Không thể kết nối máy chủ.', 'error'))
      .finally(() => setLoading(false));
  };

  /** Luồng tạo mật khẩu — bước 1: gửi OTP. */
  const handleSetupRequest = async (e) => {
    e.preventDefault();
    const { newPassword, confirmPassword } = pwForm;

    if (!newPassword || !confirmPassword) {
      showToast?.('Vui lòng điền đầy đủ thông tin mật khẩu.', 'error');
      return;
    }
    if (!validatePair()) return;

    setLoading(true);
    try {
      const res = await requestPasswordSetup(
        newPassword,
        hasUsername ? undefined : newUsername.trim().toLowerCase() || undefined,
      );
      setStep('otp');
      showToast?.(res.message || 'Đã gửi mã xác minh tới email của bạn.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Không gửi được mã xác minh.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /** Luồng tạo mật khẩu — bước 2: xác minh OTP. */
  const handleSetupConfirm = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      showToast?.('Vui lòng nhập đủ mã xác minh.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await confirmPasswordSetup(otp);
      resetAll();
      // Nhãn nút đổi về "Đổi mật khẩu" ngay, không cần tải lại trang.
      setHasPassword(true);
      if (res.user?.username) setHasUsername(true);
      showToast?.(res.message || 'Đã tạo mật khẩu thành công.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Xác minh thất bại.', 'error');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const renderChangeForm = () => (
    <form className="ctsv-profile-password-form" onSubmit={handleChangeSubmit}>
      <div className="profile-form-grid">
        <div className="profile-input-group profile-form-grid-full">
          <label htmlFor={`${idPrefix}-current-password`}>Mật khẩu hiện tại</label>
          <input
            id={`${idPrefix}-current-password`}
            type="password"
            placeholder="Nhập mật khẩu hiện tại"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
        <div className="profile-input-group">
          <label htmlFor={`${idPrefix}-new-password`}>Mật khẩu mới</label>
          <input
            id={`${idPrefix}-new-password`}
            type="password"
            placeholder="Ít nhất 6 ký tự"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
        <div className="profile-input-group">
          <label htmlFor={`${idPrefix}-confirm-password`}>Xác nhận mật khẩu</label>
          <input
            id={`${idPrefix}-confirm-password`}
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
        <Link
          to={`/forgot-password${email ? `?contact=${encodeURIComponent(email)}` : ''}`}
          className="accent-link ctsv-profile-forgot-link"
        >
          Quên mật khẩu hiện tại?
        </Link>
        <button type="submit" className="primary-button btn-save-profile" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
        </button>
      </div>
    </form>
  );

  const renderSetupForm = () => (
    <form className="ctsv-profile-password-form" onSubmit={handleSetupRequest}>
      <p className="ctsv-profile-security-note">
        Để bảo mật, chúng tôi sẽ gửi <strong>mã xác minh tới email của bạn</strong> trước khi đặt mật khẩu.
      </p>
      <div className="profile-form-grid">
        {!hasUsername && (
          <div className="profile-input-group profile-form-grid-full">
            <label htmlFor={`${idPrefix}-setup-username`}>Tên đăng nhập (tùy chọn)</label>
            <input
              id={`${idPrefix}-setup-username`}
              type="text"
              placeholder="Để trống nếu chỉ đăng nhập bằng email"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.trim().toLowerCase())}
              autoComplete="username"
              disabled={loading}
            />
            <span className="identity-field-hint">{USERNAME_HINT}</span>
          </div>
        )}
        <div className="profile-input-group">
          <label htmlFor={`${idPrefix}-new-password`}>Mật khẩu</label>
          <input
            id={`${idPrefix}-new-password`}
            type="password"
            placeholder="Ít nhất 6 ký tự"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
        <div className="profile-input-group">
          <label htmlFor={`${idPrefix}-confirm-password`}>Xác nhận mật khẩu</label>
          <input
            id={`${idPrefix}-confirm-password`}
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            autoComplete="new-password"
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
  );

  const renderOtpForm = () => (
    <form className="ctsv-profile-password-form" onSubmit={handleSetupConfirm}>
      <div className="profile-input-group profile-form-grid-full">
        <label>Mã xác minh gửi tới email của bạn</label>
        <OtpInput value={otp} onChange={setOtp} disabled={loading} idPrefix={`${idPrefix}-otp-pw`} />
      </div>
      <div className="ctsv-profile-security-actions">
        <button type="submit" className="primary-button btn-save-profile" disabled={loading}>
          {loading ? 'Đang xác minh...' : 'Xác nhận tạo mật khẩu'}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={resetAll}
          disabled={loading}
        >
          Hủy
        </button>
      </div>
    </form>
  );

  const renderBody = () => {
    if (hasPassword === null) return <p className="ctsv-profile-security-note">Đang tải...</p>;
    if (!isCreating) return renderChangeForm();
    return step === 'otp' ? renderOtpForm() : renderSetupForm();
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
          <h2>{heading}</h2>
          <p>{panelDescription}</p>
        </div>
        <span className={`ctsv-profile-security-chevron${open ? ' is-open' : ''}`} aria-hidden>
          <IconChevronDown />
        </span>
      </button>

      <div id={panelId} className={`ctsv-profile-security-panel${open ? ' is-open' : ''}`}>
        <div className="ctsv-profile-security-panel-inner">
          <div className="ctsv-profile-security-body">
            {renderBody()}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfilePasswordSection;
