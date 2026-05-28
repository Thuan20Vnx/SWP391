import { SETTINGS_SECTIONS } from './settingsConfig';
import { getSectionIcon } from './SettingsIcons';

const SettingsSidebar = ({ activeSection, onSelect, variant = 'modal' }) => {
  const isPage = variant === 'page';

  return (
    <aside className={`settings-sidebar ${isPage ? 'settings-sidebar--page' : ''}`}>
      {!isPage && (
        <div className="settings-sidebar__label hidden md:block">
          <p>Cài đặt</p>
        </div>
      )}
      <nav className="settings-sidebar__nav" aria-label="Settings navigation">
        {SETTINGS_SECTIONS.map(({ id, label }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`settings-sidebar__item ${isActive ? 'settings-sidebar__item--active' : ''}`}
            >
              <span className="settings-sidebar__icon">{getSectionIcon(id)}</span>
              <span className="settings-sidebar__text">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default SettingsSidebar;
