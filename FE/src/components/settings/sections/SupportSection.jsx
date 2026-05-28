import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';

const SupportSection = ({ showToast }) => (
  <div>
    <SettingsSectionHeader {...SECTION_META.support} />

    <SettingsCard>
      <SettingsRow
        label="Báo lỗi"
        description="Gửi báo cáo lỗi hoặc góp ý cải thiện"
        onClick={() => {}}
      />
      <SettingsRow
        label="Liên hệ admin"
        description="Nhắn tin trực tiếp với quản trị viên hệ thống"
        onClick={() => {}}
      />
    </SettingsCard>
  </div>
);

export default SupportSection;
