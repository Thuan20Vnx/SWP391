import { SettingsCard, SettingsSectionHeader } from '../SettingsLayout';
import { useTranslation } from '../../../i18n/I18nContext';
import { SECTION_META } from '../settingsConfig';
import { normalizeSettingsRole } from '../settingsRoleConfig';
import { getSecurityDescKey } from '../../../i18n/helpers';
import ProfilePasswordSection from '../../profile/ProfilePasswordSection';

const SecuritySection = ({ showToast, role = 'student' }) => {
  const { t } = useTranslation();
  const normalized = normalizeSettingsRole(role);
  const description = t(getSecurityDescKey(normalized));

  return (
    <div className="settings-section">
      <SettingsSectionHeader title={t(SECTION_META.security.titleKey)} description={description} />

      <div className="settings-section__stack">
        <SettingsCard title={t('settings.passwordCard')}>
          <ProfilePasswordSection
            showToast={showToast}
            idPrefix={`settings-${normalized}`}
            description={t('settings.passwordDesc')}
          />
        </SettingsCard>

        <SettingsCard title={t('settings.sessionCard')}>
          <p className="settings-note">{t('settings.sessionNote')}</p>
        </SettingsCard>
      </div>
    </div>
  );
};

export default SecuritySection;
