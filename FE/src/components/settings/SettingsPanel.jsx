import { useState } from 'react';
import { useSettingsPreferences } from '../../hooks/useSettingsPreferences';
import SettingsSidebar from './SettingsSidebar';
import SecuritySection from './sections/SecuritySection';
import NotificationsSection from './sections/NotificationsSection';
import AppearanceSection from './sections/AppearanceSection';
import SupportSection from './sections/SupportSection';
import AboutSection from './sections/AboutSection';

const SettingsPanel = ({ showToast }) => {
  const [activeSection, setActiveSection] = useState('security');
  const { settings, updateSetting } = useSettingsPreferences();

  const renderSection = () => {
    switch (activeSection) {
      case 'security':
        return <SecuritySection showToast={showToast} />;
      case 'notifications':
        return <NotificationsSection settings={settings} updateSetting={updateSetting} />;
      case 'appearance':
        return (
          <AppearanceSection
            settings={settings}
            updateSetting={updateSetting}
            showToast={showToast}
          />
        );
      case 'support':
        return <SupportSection />;
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
