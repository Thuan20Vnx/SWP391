import { useNavigate } from 'react-router-dom';
import SettingsRow from '../SettingsRow';
import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { APP_VERSION, SECTION_META } from '../settingsConfig';
import { useTranslation } from '../../../i18n/I18nContext';

const AboutSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="settings-section">
      <SettingsSectionHeader
        title={t(SECTION_META.about.titleKey)}
        description={t(SECTION_META.about.descKey)}
      />

      <SettingsCard>
        <div className="settings-info-row">
          <div>
            <p className="settings-info-row__label">{t('settings.aboutVersion')}</p>
            <p className="settings-info-row__desc">{t('settings.aboutPlatform')}</p>
          </div>
          <span className="settings-version-badge">v{APP_VERSION}</span>
        </div>
        <SettingsRow
          label={t('settings.aboutPrivacy')}
          description={t('settings.aboutPrivacyDesc')}
          onClick={() => navigate('/privacy')}
        />
        <SettingsRow
          label={t('settings.aboutTerms')}
          description={t('settings.aboutTermsDesc')}
          onClick={() => navigate('/terms')}
        />
      </SettingsCard>
    </div>
  );
};

export default AboutSection;
