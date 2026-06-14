import SettingsToggle from '../SettingsToggle';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';
import { getRoleSectionDescription } from '../settingsRoleConfig';

const NotificationsSection = ({
  role,
  notificationOptions,
  getNotificationValue,
  setNotificationValue,
}) => {
  const description =
    getRoleSectionDescription('notifications', role) || SECTION_META.notifications.description;

  return (
    <div className="settings-section">
      <SettingsSectionHeader title={SECTION_META.notifications.title} description={description} />

      <SettingsCard>
        {notificationOptions.map((opt) => (
          <SettingsToggle
            key={opt.key}
            label={opt.label}
            description={opt.description}
            checked={getNotificationValue(opt.key, opt.defaultValue)}
            onChange={(value) => setNotificationValue(opt.key, value, opt.universal === true)}
          />
        ))}
      </SettingsCard>
    </div>
  );
};

export default NotificationsSection;
