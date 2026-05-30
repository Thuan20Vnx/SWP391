import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * Dropdown chọn thay thế <select> native — dùng toàn hệ thống.
 * onChange tương thích: (e) => e.target.value / e.target.name
 */
const AppSelect = ({
  id: idProp,
  name,
  value = '',
  onChange,
  options = [],
  placeholder = '— Chọn —',
  disabled = false,
  className = '',
  variant = 'default',
  'aria-label': ariaLabel,
  fullWidth = true
}) => {
  const autoId = useId();
  const id = idProp || autoId;
  const listboxId = `${id}-listbox`;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const normalized = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : { value: String(opt.value), label: opt.label }
      ),
    [options]
  );

  const selected = useMemo(
    () => normalized.find((o) => o.value === String(value)),
    [normalized, value]
  );

  const displayLabel = selected?.label ?? placeholder;

  const emitChange = useCallback(
    (nextValue) => {
      onChange?.({
        target: { name: name || '', value: nextValue, id }
      });
    },
    [onChange, name, id]
  );

  const pick = (nextValue) => {
    emitChange(nextValue);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const rootClass = [
    'app-select',
    `app-select--${variant}`,
    fullWidth ? 'app-select--full' : '',
    open ? 'is-open' : '',
    disabled ? 'is-disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="app-select__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel || undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className={`app-select__value${!selected ? ' is-placeholder' : ''}`}>{displayLabel}</span>
        <span className="app-select__chevron" aria-hidden>
          <svg viewBox="0 0 12 8" width="12" height="8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open && (
        <ul id={listboxId} className="app-select__menu" role="listbox" aria-labelledby={id}>
          {normalized.map((opt) => {
            const isActive = opt.value === String(value);
            return (
              <li key={opt.value || '__empty'} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`app-select__option${isActive ? ' is-selected' : ''}`}
                  onClick={() => pick(opt.value)}
                >
                  <span className="app-select__option-label">{opt.label}</span>
                  {isActive && (
                    <span className="app-select__check" aria-hidden>
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                        <path
                          d="M3 8.5L6.5 12L13 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {name ? (
        <input type="hidden" name={name} value={value} readOnly tabIndex={-1} aria-hidden />
      ) : null}
    </div>
  );
};

export default AppSelect;
