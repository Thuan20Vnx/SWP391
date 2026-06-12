const SettingsSectionHeader = ({ title, description }) => (
  <header className="settings-section-header">
    <h2 className="settings-section-header__title">{title}</h2>
    {description && <p className="settings-section-header__desc">{description}</p>}
  </header>
);

const SettingsCard = ({ children, title }) => (
  <section className="settings-group">
    {title && <h3 className="settings-group__label">{title}</h3>}
    <div className="settings-group__body">{children}</div>
  </section>
);

export { SettingsSectionHeader, SettingsCard };
