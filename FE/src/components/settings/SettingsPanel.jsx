import { useState } from 'react';
import { getUserRole, normalizeRole } from '../../utils/auth';
import { useSettingsPreferences } from '../../hooks/useSettingsPreferences';
import { normalizeSettingsRole } from './settingsRoleConfig';
import SettingsSidebar from './SettingsSidebar';
import SecuritySection from './sections/SecuritySection';
import AppearanceSection from './sections/AppearanceSection';
import SupportSection from './sections/SupportSection';
import AboutSection from './sections/AboutSection';

const SettingsPanel = ({ showToast, role: roleProp, initialSection = 'security' }) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const role = normalizeSettingsRole(roleProp || normalizeRole(getUserRole()));
  const { settings, updateSetting } = useSettingsPreferences();

  const renderSection = () => {
    switch (activeSection) {
      case 'security':
        return <SecuritySection showToast={showToast} role={role} />;
      case 'appearance':
        return (
          <AppearanceSection
            settings={settings}
            updateSetting={updateSetting}
            showToast={showToast}
          />
        );
      case 'support':
        return <SupportSection role={role} />;
      case 'about':
        return <AboutSection />;
      default:
        return null;
    }
  };

  return (
    <div className="settings-panel">
      <SettingsSidebar activeSection={activeSection} onSelect={setActiveSection} />
      <main className="settings-panel__content">{renderSection()}</main>
    </div>
  );
};

export default SettingsPanel;
