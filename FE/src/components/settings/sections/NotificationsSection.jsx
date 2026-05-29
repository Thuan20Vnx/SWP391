import SettingsToggle from '../SettingsToggle';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';

const NotificationsSection = ({ settings, updateSetting }) => (
  <div className="settings-section">
    <SettingsSectionHeader {...SECTION_META.notifications} />

    <SettingsCard>
      <SettingsToggle
        label="Nhắc lịch sự kiện"
        description="Thông báo trước khi sự kiện đã đăng ký bắt đầu"
        checked={settings.eventReminders}
        onChange={(value) => updateSetting('eventReminders', value)}
      />
      <SettingsToggle
        label="Thông báo qua email"
        description="Nhận email khi có cập nhật sự kiện hoặc thông báo mới"
        checked={settings.emailNotifications}
        onChange={(value) => updateSetting('emailNotifications', value)}
      />
      <SettingsToggle
        label="Âm thanh thông báo"
        description="Phát âm thanh khi có thông báo trên trình duyệt"
        checked={settings.soundNotifications}
        onChange={(value) => updateSetting('soundNotifications', value)}
      />
    </SettingsCard>
  </div>
);

export default NotificationsSection;
