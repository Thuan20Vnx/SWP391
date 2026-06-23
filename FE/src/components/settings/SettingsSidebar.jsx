import { SETTINGS_SECTIONS } from './settingsConfig';
import { getSectionIcon } from './SettingsIcons';
import { useTranslation } from '../../i18n/I18nContext';

const SettingsSidebar = ({ activeSection, onSelect }) => {
  const { t } = useTranslation();

  return (
    <aside className="settings-sidebar">
      <p className="settings-sidebar__heading">{t('settings.categories')}</p>
      <nav className="settings-sidebar__nav" aria-label={t('settings.navLabel')}>
        {SETTINGS_SECTIONS.map(({ id, labelKey }) => {
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
              <span className="settings-sidebar__text">{t(labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default SettingsSidebar;
