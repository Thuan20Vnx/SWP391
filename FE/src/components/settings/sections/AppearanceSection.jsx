import AppSelect from '../../ui/AppSelect';
import SettingsToggle from '../SettingsToggle';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
];

const AppearanceSection = ({ settings, updateSetting }) => (
  <div className="settings-section">
    <SettingsSectionHeader {...SECTION_META.appearance} />

    <div className="settings-section__stack">
      <SettingsCard>
        <SettingsToggle
          label="Chế độ tối"
          description="Giảm ánh sáng màn hình khi sử dụng ban đêm"
          checked={settings.darkMode}
          onChange={(value) => updateSetting('darkMode', value)}
        />
      </SettingsCard>

      <SettingsCard title="Ngôn ngữ hiển thị">
        <div className="profile-input-group settings-select-field">
          <label htmlFor="settings-language">Ngôn ngữ</label>
          <AppSelect
            id="settings-language"
            value={settings.language}
            onChange={(e) => updateSetting('language', e.target.value)}
            options={LANGUAGES}
          />
        </div>
      </SettingsCard>
    </div>
  </div>
);

export default AppearanceSection;
