import { useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../../utils/api';
import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';

const SecuritySection = ({ showToast }) => {
  const isGoogleLogin = localStorage.getItem('loginMethod') === 'google';
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Vui lòng điền đầy đủ thông tin mật khẩu.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Xác nhận mật khẩu không khớp.', 'error');
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/user/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setLoading(false);
        if (status === 200) {
          setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setShowForm(false);
          showToast('Đổi mật khẩu thành công.', 'success');
        } else {
          showToast(data.message || 'Đổi mật khẩu thất bại.', 'error');
        }
      })
      .catch(() => {
        setLoading(false);
        showToast('Không thể kết nối máy chủ.', 'error');
      });
  };

  const handleLogoutAllDevices = () => {
    showToast('Tính năng đang được phát triển.', 'info');
  };

  return (
    <div className="settings-section">
      <SettingsSectionHeader {...SECTION_META.security} />

      <div className="settings-section__stack">
        <SettingsCard title="Mật khẩu">
          {isGoogleLogin ? (
            <p className="settings-note">
              Tài khoản đăng nhập bằng Google không hỗ trợ đổi mật khẩu tại đây.
            </p>
          ) : !showForm ? (
            <SettingsRow
              label="Đổi mật khẩu"
              description="Cập nhật mật khẩu đăng nhập của bạn"
              onClick={() => setShowForm(true)}
            />
          ) : (
            <form className="settings-form" onSubmit={handlePasswordSubmit}>
              <div className="profile-input-group">
                <label htmlFor="current-password">Mật khẩu hiện tại</label>
                <input
                  id="current-password"
                  type="password"
                  placeholder="Nhập mật khẩu hiện tại"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                />
              </div>
              <div className="profile-input-group">
                <label htmlFor="new-password">Mật khẩu mới</label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="Ít nhất 6 ký tự"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </div>
              <div className="profile-input-group">
                <label htmlFor="confirm-password">Xác nhận mật khẩu</label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
              <div className="settings-form__actions">
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'Đang lưu...' : 'Lưu mật khẩu'}
                </button>
                <button
                  type="button"
                  className="settings-form__cancel"
                  onClick={() => setShowForm(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </SettingsCard>

        <SettingsCard title="Phiên đăng nhập">
          <SettingsRow
            label="Đăng xuất tất cả thiết bị"
            description="Kết thúc mọi phiên đăng nhập trên các thiết bị khác"
            variant="danger"
            onClick={handleLogoutAllDevices}
          />
        </SettingsCard>
      </div>
    </div>
  );
};

export default SecuritySection;
