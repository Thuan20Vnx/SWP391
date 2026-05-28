import SettingsToggle from '../SettingsToggle';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
];

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:max-w-xs';

const AppearanceSection = ({ settings, updateSetting, showToast }) => (
  <div>
    <SettingsSectionHeader {...SECTION_META.appearance} />

    <div className="space-y-4">
      <SettingsCard>
        <SettingsToggle
          label="Dark mode"
          description="Chuyển giao diện sang chế độ tối"
          checked={settings.darkMode}
          onChange={(value) => updateSetting('darkMode', value)}
        />
      </SettingsCard>

      <SettingsCard title="Ngôn ngữ">
        <select
          value={settings.language}
          onChange={(e) => {
            updateSetting('language', e.target.value);
          }}
          className={selectClass}
        >
          {LANGUAGES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </SettingsCard>
    </div>
  </div>
);

export default AppearanceSection;
