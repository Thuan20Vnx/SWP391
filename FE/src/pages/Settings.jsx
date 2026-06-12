import { Navigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import SettingsPanel from '../components/settings/SettingsPanel';
import { normalizeSettingsRole } from '../components/settings/settingsRoleConfig';
import { getUserRole, normalizeRole } from '../utils/auth';

const PORTAL_SETTINGS_PATH = {
  ctsv: '/ctsv/settings',
  icpdp: '/icpdp/settings',
  partner: '/partner/settings',
  admin: '/admin/settings',
};

const Settings = ({ showToast }) => {
  const role = normalizeSettingsRole(normalizeRole(getUserRole()));
  const portalPath = PORTAL_SETTINGS_PATH[role];

  if (portalPath) {
    return <Navigate to={portalPath} replace />;
  }

  return (
    <StudentDashboardLayout
      activeMenu="settings"
      pageTitle="Cài đặt và bảo mật"
      pageSubtitle="Quản lý mật khẩu và giao diện ứng dụng."
      showToast={showToast}
    >
      <div className="settings-shell">
        <SettingsPanel showToast={showToast} role={role} />
      </div>
    </StudentDashboardLayout>
  );
};

export default Settings;
