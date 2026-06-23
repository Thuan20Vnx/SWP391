import AppSelect from '../../ui/AppSelect';
import SettingsToggle from '../SettingsToggle';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { SECTION_META } from '../settingsConfig';
import { useTranslation } from '../../../i18n/I18nContext';

const AppearanceSection = ({ settings, updateSetting }) => {
  const { t } = useTranslation();
  const languageOptions = [
    { value: 'vi', label: t('settings.languageVi') },
    { value: 'en', label: t('settings.languageEn') },
  ];

  return (
    <div className="settings-section">
      <SettingsSectionHeader
        title={t(SECTION_META.appearance.titleKey)}
        description={t(SECTION_META.appearance.descKey)}
      />

      <div className="settings-section__stack">
        <SettingsCard>
          <SettingsToggle
            label={t('settings.darkMode')}
            description={t('settings.darkModeDesc')}
            checked={settings.darkMode}
            onChange={(value) => updateSetting('darkMode', value)}
          />
        </SettingsCard>

        <SettingsCard title={t('settings.languageTitle')}>
          <div className="profile-input-group settings-select-field">
            <label htmlFor="settings-language">{t('settings.language')}</label>
            <AppSelect
              id="settings-language"
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
              options={languageOptions}
              usePortal
            />
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};

export default AppearanceSection;
