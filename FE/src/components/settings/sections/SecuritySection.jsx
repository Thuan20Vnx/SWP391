import { useCallback, useEffect, useState } from 'react';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';
import { getRoleSectionDescription } from '../settingsRoleConfig';
import ProfilePasswordSection from '../../profile/ProfilePasswordSection';
import ProfileEmailSection from '../../profile/ProfileEmailSection';
import ProfileUsernameSection from '../../profile/ProfileUsernameSection';
import { API_BASE, getAuthHeaders } from '../../../utils/api';

const SecuritySection = ({ showToast, role = 'student' }) => {
  const description =
    getRoleSectionDescription('security', role) || SECTION_META.security.description;

  const [account, setAccount] = useState({ email: '', username: '' });

  const loadAccount = useCallback(() => {
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.user) return;
        setAccount({ email: data.user.email || '', username: data.user.username || '' });
      })
      .catch(() => {
        // Không chặn cả trang chỉ vì không đọc được email/tên đăng nhập hiện tại.
        setAccount({ email: localStorage.getItem('userEmail') || '', username: '' });
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
