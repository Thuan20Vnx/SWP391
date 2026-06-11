import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';
import { getRoleSectionDescription } from '../settingsRoleConfig';
import ProfilePasswordSection from '../../profile/ProfilePasswordSection';

const SecuritySection = ({ showToast, role = 'student' }) => {
  const description =
    getRoleSectionDescription('security', role) || SECTION_META.security.description;

  return (
    <div className="settings-section">
      <SettingsSectionHeader title={SECTION_META.security.title} description={description} />

      <div className="settings-section__stack">
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
