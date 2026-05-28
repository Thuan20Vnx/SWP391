import SettingsToggle from '../SettingsToggle';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';

const NotificationsSection = ({ settings, updateSetting }) => (
  <div>
    <SettingsSectionHeader {...SECTION_META.notifications} />

    <SettingsCard>
      <SettingsToggle
        label="Nhắc lịch sự kiện"
        description="Nhận nhắc nhở trước khi sự kiện bắt đầu"
        checked={settings.eventReminders}
        onChange={(value) => updateSetting('eventReminders', value)}
      />
      <SettingsToggle
        label="Email notification"
        description="Gửi thông báo qua email khi có cập nhật"
        checked={settings.emailNotifications}
        onChange={(value) => updateSetting('emailNotifications', value)}
      />
      <SettingsToggle
        label="Âm thanh thông báo"
        description="Phát âm thanh khi có thông báo mới"
        checked={settings.soundNotifications}
        onChange={(value) => updateSetting('soundNotifications', value)}
      />
    </SettingsCard>
  </div>
);

export default NotificationsSection;
