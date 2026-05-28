const SettingsSectionHeader = ({ title, description }) => (
  <div className="mb-6 border-b border-slate-100 pb-5 dark:border-slate-800">
    <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
    {description && (
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    )}
  </div>
);

const SettingsCard = ({ children, title }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 sm:p-5">
    {title && (
      <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
    )}
    {children}
  </div>
);

export { SettingsSectionHeader, SettingsCard };
