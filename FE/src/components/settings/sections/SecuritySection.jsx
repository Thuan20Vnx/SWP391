import { useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../../utils/api';
import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

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
        } else {
          showToast(data.message || 'Đổi mật khẩu thất bại.', 'error');
        }
      })
      .catch(() => {
        setLoading(false);
        showToast('Không thể kết nối máy chủ.', 'error');
      });
  };

  const handleLogoutAllDevices = () => {};

  return (
    <div>
      <SettingsSectionHeader {...SECTION_META.security} />

      <div className="space-y-4">
        <SettingsCard title="Mật khẩu">
          {isGoogleLogin ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tài khoản đăng nhập qua Google không hỗ trợ đổi mật khẩu tại đây.
            </p>
          ) : (
            <>
              {!showForm ? (
                <SettingsRow
                  label="Đổi mật khẩu"
                  description="Cập nhật mật khẩu đăng nhập của bạn"
                  onClick={() => setShowForm(true)}
                />
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <input
                    type="password"
                    placeholder="Mật khẩu hiện tại"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className={inputClass}
                  />
                  <input
                    type="password"
                    placeholder="Mật khẩu mới"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className={inputClass}
                  />
                  <input
                    type="password"
                    placeholder="Xác nhận mật khẩu mới"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className={inputClass}
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {loading ? 'Đang lưu...' : 'Lưu mật khẩu'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}
            </>
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
