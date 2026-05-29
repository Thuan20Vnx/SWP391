import { SettingsIcons } from './SettingsIcons';

const SettingsRow = ({ label, description, onClick, variant = 'default' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`settings-row ${variant === 'danger' ? 'settings-row--danger' : ''}`}
  >
    <span className="settings-row__content">
      <span className="settings-row__label">{label}</span>
      {description && <span className="settings-row__desc">{description}</span>}
    </span>
    <span className="settings-row__chevron">{SettingsIcons.chevron}</span>
  </button>
);

export default SettingsRow;
