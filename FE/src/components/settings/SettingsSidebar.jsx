import { SETTINGS_SECTIONS } from './settingsConfig';
import { getSectionIcon } from './SettingsIcons';

const SettingsSidebar = ({ activeSection, onSelect }) => (
  <aside className="settings-sidebar">
    <p className="settings-sidebar__heading">Danh mục</p>
    <nav className="settings-sidebar__nav" aria-label="Điều hướng cài đặt">
      {SETTINGS_SECTIONS.map(({ id, label }) => {
        const isActive = activeSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`settings-sidebar__item ${isActive ? 'is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="settings-sidebar__icon">{getSectionIcon(id)}</span>
            <span className="settings-sidebar__text">{label}</span>
          </button>
        );
      })}
    </nav>
  </aside>
);

export default SettingsSidebar;
