import { SettingsIcons } from './SettingsIcons';

const SettingsRow = ({ label, description, onClick, variant = 'default' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-200 ${
      variant === 'danger'
        ? 'hover:bg-red-50 dark:hover:bg-red-950/30'
        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
    }`}
  >
    <div className="min-w-0 flex-1">
      <p
        className={`text-sm font-medium transition-colors duration-200 ${
          variant === 'danger'
            ? 'text-slate-700 group-hover:text-red-500 dark:text-slate-200 dark:group-hover:text-red-400'
            : 'text-slate-800 dark:text-slate-100'
        }`}
      >
        {label}
      </p>
      {description && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
    <span className="shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-300">
      {SettingsIcons.chevron}
    </span>
  </button>
);

export default SettingsRow;
