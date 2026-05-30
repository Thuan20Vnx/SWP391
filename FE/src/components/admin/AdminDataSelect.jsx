import React, { useEffect, useId, useRef, useState } from 'react';

const ChevronIcon = ({ open }) => (
  <svg
    className={`admin-data-select__chevron${open ? ' admin-data-select__chevron--open' : ''}`}
    viewBox="0 0 24 24"
    width="18"
    height="18"
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M20 6L9 17l-5-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AdminDataSelect = ({
  label,
  labelClassName,
  value,
  options,
  placeholder,
  onChange,
  disabled,
  required,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const selected = options.find((opt) => opt.value === value);
  const displayLabel = selected?.label ?? placeholder ?? '';
  const isPlaceholder = !selected && !!placeholder;

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [open]);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className="admin-data-field" ref={rootRef}>
      {label && (
        <span
          className={`admin-data-field__label${labelClassName ? ` ${labelClassName}` : ''}`}
          id={`${listId}-label`}
        >
          {label}
        </span>
      )}
      <button
        type="button"
        className={`admin-data-select__trigger${open ? ' admin-data-select__trigger--open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${listId}-label` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span
          className={`admin-data-select__value${isPlaceholder ? ' admin-data-select__value--placeholder' : ''}`}
        >
          {displayLabel}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul className="admin-data-select__menu" role="listbox" id={listId} aria-label={label}>
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`admin-data-select__option${isActive ? ' admin-data-select__option--active' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span className="admin-data-select__option-label">{opt.label}</span>
                  {isActive && (
                    <span className="admin-data-select__check" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {required && (
        <input
          type="text"
          tabIndex={-1}
          className="admin-data-field__native-required"
          value={value ?? ''}
          onChange={() => {}}
          required
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default AdminDataSelect;
