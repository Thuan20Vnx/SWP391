import React from 'react';

const CtsvHamburgerButton = ({
  onClick,
  className = '',
  ariaLabel = 'Mở menu điều hướng'
}) => (
  <button
    type="button"
    className={`ctsv-portal-hamburger${className ? ` ${className}` : ''}`}
    onClick={onClick}
    aria-label={ariaLabel}
  >
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
    </svg>
  </button>
);

export default CtsvHamburgerButton;
