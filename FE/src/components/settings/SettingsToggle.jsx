const SettingsToggle = ({ checked, onChange, label, description, disabled = false }) => (
  <div className="settings-toggle-row">
    <div className="settings-toggle-row__text">
      <p className="settings-toggle-row__label">{label}</p>
      {description && <p className="settings-toggle-row__desc">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`settings-switch ${checked ? 'is-on' : ''}`}
    >
      <span className="settings-switch__thumb" />
    </button>
  </div>
);

export default SettingsToggle;
