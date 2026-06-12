import SettingsPanel from '../components/settings/SettingsPanel';
import { normalizeSettingsRole } from '../components/settings/settingsRoleConfig';
import { useTranslation } from '../i18n/I18nContext';

const PORTAL_SUBTITLE_KEYS = {
  ctsv: 'settings.portalSubtitle.ctsv',
  icpdp: 'settings.portalSubtitle.icpdp',
  partner: 'settings.portalSubtitle.partner',
  admin: 'settings.portalSubtitle.admin',
};

const PortalSettingsView = ({ showToast, role }) => {
  const { t } = useTranslation();
  const normalized = normalizeSettingsRole(role);
  const subtitleKey = PORTAL_SUBTITLE_KEYS[normalized] || PORTAL_SUBTITLE_KEYS.ctsv;

  return (
    <div className="ctsv-dashboard partner-settings-page">
      <div className="partner-settings-header">
        <div className="partner-settings-header__title">
          <h1>{t('settings.portalTitle')}</h1>
          <p>{t(subtitleKey)}</p>
        </div>
      </div>
      <div className="settings-shell settings-shell--portal">
        <SettingsPanel showToast={showToast} role={normalized} />
      </div>
    </div>
  );
};

export default PortalSettingsView;
