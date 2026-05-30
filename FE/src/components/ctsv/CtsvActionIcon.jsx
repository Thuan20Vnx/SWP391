import React from 'react';

/** Icon hành động CTSV — cùng style với CtsvNavIcon */
const CtsvActionIcon = ({ type, size = 18 }) => {
  const common = {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  switch (type) {
    case 'event':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
          <path d="M9 14.5l2 2 3.5-3.5" />
        </svg>
      );
    case 'hide':
      return (
        <svg {...common}>
          <path d="M2 12s4-6.5 10-6.5 10 6.5 10 6.5-4 6.5-10 6.5S2 12 2 12z" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M4 4l16 16" />
        </svg>
      );
    case 'delete':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h1A1.5 1.5 0 0 1 14 5.5V7" />
          <path d="M6.5 7l.75 12a1.5 1.5 0 0 0 1.5 1.5h6.5a1.5 1.5 0 0 0 1.5-1.5L17.5 7" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      );
    default:
      return null;
  }
};

export default CtsvActionIcon;
