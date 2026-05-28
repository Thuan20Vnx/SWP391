const SettingsToggle = ({ checked, onChange, label, description, disabled = false }) => (
  <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
      {description && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export default SettingsToggle;
