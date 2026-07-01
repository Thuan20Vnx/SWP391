import React, { useState } from 'react';
import { useCloseOnClickOutside } from '../../hooks/useCloseOnClickOutside';

const AdminStlFilterDropdown = ({
  label,
  value,
  options,
  onChange,
  ariaLabel = 'Bộ lọc',
}) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useCloseOnClickOutside(ref, open, () => setOpen(false));

  const activeLabel = options.find((o) => o.id === value)?.label || label;

  return (
    <div className="stl-filter-dropdown" ref={ref}>
      <button
        type="button"
        className={`stl-filter-pill${open ? ' stl-filter-pill--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        <span>{activeLabel}</span>
        <svg className="stl-filter-caret" viewBox="0 0 10 6" width="10" height="6" fill="currentColor" aria-hidden>
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>
      {open && (
        <div className="stl-filter-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={value === opt.id}
              className={`stl-filter-menu-item${value === opt.id ? ' stl-filter-menu-item--active' : ''}`}
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminStlFilterDropdown;
