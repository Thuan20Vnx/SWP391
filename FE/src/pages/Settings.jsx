import StudentDashboardLayout from '../components/StudentDashboardLayout';
import SettingsPanel from '../components/settings/SettingsPanel';

const Settings = ({ showToast }) => (
  <StudentDashboardLayout
    activeMenu="settings"
    pageTitle="Cài đặt và bảo mật"
    pageSubtitle="Quản lý mật khẩu, thông báo và giao diện ứng dụng."
    showToast={showToast}
  >
    <div className="settings-shell">
      <SettingsPanel showToast={showToast} />
    </div>
  </StudentDashboardLayout>
);

export default Settings;
