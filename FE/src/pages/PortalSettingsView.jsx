import SettingsPanel from '../components/settings/SettingsPanel';
import { normalizeSettingsRole } from '../components/settings/settingsRoleConfig';

const PORTAL_SETTINGS_COPY = {
  ctsv: {
    title: 'Cài đặt tài khoản',
    subtitle: 'Bảo mật và giao diện portal CTSV.',
  },
  icpdp: {
    title: 'Cài đặt tài khoản',
    subtitle: 'Bảo mật và giao diện portal IC-PDP.',
  },
  partner: {
    title: 'Cài đặt tài khoản',
    subtitle: 'Bảo mật và giao diện portal đối tác.',
  },
  admin: {
    title: 'Cài đặt tài khoản',
    subtitle: 'Bảo mật và giao diện cổng quản trị.',
  },
};

const PortalSettingsView = ({ showToast, role }) => {
  const normalized = normalizeSettingsRole(role);
  const copy = PORTAL_SETTINGS_COPY[normalized] || PORTAL_SETTINGS_COPY.ctsv;

  return (
    <div className="ctsv-dashboard partner-settings-page">
      <div className="partner-settings-header">
        <div className="partner-settings-header__title">
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
      </div>
      <div className="settings-shell settings-shell--portal">
        <SettingsPanel showToast={showToast} role={normalized} />
      </div>
    </div>
  );
};

export default PortalSettingsView;
