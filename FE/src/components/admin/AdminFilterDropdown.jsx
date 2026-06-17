import React, { useEffect, useRef } from 'react';

const ChevronIcon = ({ open }) => (
  <svg
    className={`admin-filter-dropdown__chevron${open ? ' admin-filter-dropdown__chevron--open' : ''}`}
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

const AdminFilterDropdown = ({
  label,
  value,
  options,
  onChange,
  menuOpen,
  onMenuToggle,
  menuId,
  triggerLabel,
}) => {
  const rootRef = useRef(null);
  const selected = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        onMenuToggle(null);
      }
    };

    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [menuOpen, onMenuToggle]);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    onMenuToggle(null);
  };

  return (
    <div className="admin-filter-dropdown" ref={rootRef}>
      <span className="admin-log-filter-label">{label}</span>
      <button
        type="button"
        className={`admin-filter-dropdown__trigger${menuOpen ? ' admin-filter-dropdown__trigger--open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        onClick={() => onMenuToggle(menuOpen ? null : menuId)}
      >
        <span className="admin-filter-dropdown__value">{triggerLabel || selected?.label}</span>
        <ChevronIcon open={menuOpen} />
      </button>

      {menuOpen && (
        <ul className="admin-filter-dropdown__menu" role="listbox" aria-label={label}>
          {options.map((opt) => {
            const isActive = !triggerLabel && opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`admin-filter-dropdown__option${isActive ? ' admin-filter-dropdown__option--active' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.icon && <span className="admin-filter-dropdown__option-icon">{opt.icon}</span>}
                  <span className="admin-filter-dropdown__option-label">{opt.label}</span>
                  {isActive && <span className="admin-filter-dropdown__check"><CheckIcon /></span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminFilterDropdown;
