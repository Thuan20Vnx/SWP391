import { useCallback, useEffect, useState } from 'react';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';
import { getRoleSectionDescription } from '../settingsRoleConfig';
import ProfilePasswordSection from '../../profile/ProfilePasswordSection';
import ProfileEmailSection from '../../profile/ProfileEmailSection';
import ProfileUsernameSection from '../../profile/ProfileUsernameSection';
import { API_BASE, getAuthHeaders } from '../../../utils/api';
import { startGoogleLink } from '../../../utils/googleAuth';

const SecuritySection = ({ showToast, role = 'student' }) => {
  const description =
    getRoleSectionDescription('security', role) || SECTION_META.security.description;

  const [account, setAccount] = useState({
    email: '',
    username: '',
    hasPassword: true,
    hasGoogleLinked: false,
  });

  const loadAccount = useCallback(() => {
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.user) return;
        setAccount({
          email: data.user.email || '',
          username: data.user.username || '',
          hasPassword: Boolean(data.user.hasPassword),
          hasGoogleLinked: Boolean(data.user.hasGoogleLinked),
        });
      })
      .catch(() => {
        // Không chặn cả trang chỉ vì không đọc được email/tên đăng nhập hiện tại.
        setAccount((prev) => ({
          ...prev,
          email: localStorage.getItem('userEmail') || '',
          username: '',
        }));
      });
  }, []);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  const handleIdentityChanged = (user) => {
    if (user) setAccount({ email: user.email || '', username: user.username || '' });
    else loadAccount();
  };

  return (
    <div className="settings-section">
      <SettingsSectionHeader title={SECTION_META.security.title} description={description} />

      <div className="settings-section__stack">
        <SettingsCard title="Tài khoản đăng nhập">
          <ProfileEmailSection
            showToast={showToast}
            idPrefix={`settings-${role}`}
            currentEmail={account.email}
            onChanged={handleIdentityChanged}
          />
          <ProfileUsernameSection
            showToast={showToast}
            idPrefix={`settings-${role}`}
            currentUsername={account.username}
            onChanged={handleIdentityChanged}
          />
        </SettingsCard>

        <SettingsCard title="Mật khẩu">
          <ProfilePasswordSection
            showToast={showToast}
            idPrefix={`settings-${role}`}
            description="Cập nhật mật khẩu đăng nhập tài khoản của bạn."
          />
        </SettingsCard>

        <SettingsCard title="Liên kết tài khoản">
          <div className="ctsv-profile-security-card">
            <div className="ctsv-profile-security-toggle-main" style={{ padding: '1rem 1.25rem' }}>
              <h2>Tài khoản Google</h2>
              <p>
                {account.hasGoogleLinked
                  ? `Đã liên kết với ${account.email}. Bạn có thể đăng nhập bằng Google hoặc bằng email và mật khẩu.`
                  : 'Chưa liên kết. Liên kết để đăng nhập nhanh bằng Google, vẫn giữ nguyên cách đăng nhập bằng mật khẩu.'}
              </p>
            </div>
            {!account.hasGoogleLinked && (
              <div className="ctsv-profile-security-actions" style={{ padding: '0 1.25rem 1.25rem' }}>
                <button
                  type="button"
                  className="primary-button btn-save-profile"
                  onClick={() => startGoogleLink(account.email, window.location.pathname)}
                  disabled={!account.email}
                >
                  Liên kết Google
                </button>
              </div>
            )}
          </div>
        </SettingsCard>

        <SettingsCard title="Phiên đăng nhập">
          <p className="settings-note">
            Đăng xuất trên thiết bị khác sẽ có trong bản cập nhật tiếp theo. Hiện tại bạn có thể đăng xuất
            thủ công từ menu tài khoản.
          </p>
        </SettingsCard>
      </div>
    </div>
  );
};

export default SecuritySection;
