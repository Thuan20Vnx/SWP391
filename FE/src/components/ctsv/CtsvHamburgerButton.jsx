import React from 'react';

const CtsvHamburgerButton = ({
  onClick,
  className = '',
  ariaLabel = 'Mở menu điều hướng',
  expanded = false,
}) => (
  <button
    type="button"
    className={`ctsv-portal-hamburger${className ? ` ${className}` : ''}`}
    onClick={onClick}
    aria-label={ariaLabel}
    aria-expanded={expanded}
  >
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {expanded ? (
        <path
          d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
          fill="currentColor"
        />
      )}
    </svg>
  </button>
);

export default CtsvHamburgerButton;
