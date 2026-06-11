import React from 'react';

const CtsvNavIcon = ({ type }) => {
  const common = {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  switch (type) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4.5-5.5 7-5.5s5.5 2 7 5.5" />
        </svg>
      );
    case 'partners':
      return (
        <svg {...common}>
          <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
          <rect x="8" y="6" width="8" height="13" rx="1.5" />
          <path d="M11 12l2 2 4-4.5" />
        </svg>
      );
    case 'create':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
          <path d="M13.5 8.5l3 3" />
          <path d="M12 20h8" />
        </svg>
      );
    case 'publish':
      return (
        <svg {...common}>
          <path d="M5 5h9l5 5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          <path d="M14 5v5h5" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );
    case 'announce':
      return (
        <svg {...common}>
          <path d="M12 4a3 3 0 0 1 3 3v4.5l2 2.5H7l2-2.5V7a3 3 0 0 1 3-3z" />
          <path d="M10 19h4" />
        </svg>
      );
    case 'broadcast':
      return (
        <svg {...common}>
          <path d="M4 10v4" />
          <path d="M7 8l11-4v16L7 16v-2" />
          <path d="M7 14h3.5v4H7z" />
        </svg>
      );
    case 'approval':
      return (
        <svg {...common}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 14l2 2 4-4.5" />
        </svg>
      );
    case 'proposals':
      return (
        <svg {...common}>
          <path d="M7 4h10l3 3v13H4V7l3-3z" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...common}>
          <path d="M5 19V9M12 19V5M19 19v-7" />
        </svg>
      );
    case 'participants':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.5" />
          <circle cx="16" cy="9" r="2" />
          <path d="M4 19c.8-2.5 2.8-4 5-4s4.2 1.5 5 4" />
          <path d="M14 19c.5-1.5 1.8-2.5 3.5-2.5" />
        </svg>
      );
    case 'accounts':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="15" rx="2" />
          <path d="M8 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
          <circle cx="9" cy="12" r="2" />
          <path d="M6 17c.65-1.65 1.75-2.5 3-2.5s2.35.85 3 2.5" />
          <path d="M14 11h4M14 15h3" />
        </svg>
      );
    case 'notifications':
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'system':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case 'transfer':
      return (
        <svg {...common}>
          <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3z" />
          <path d="M8 13c-2.67 0-8 1.34-8 4v3h8M16 13c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-3c0-2.67-5.33-4-8-4z" />
        </svg>
      );
    case 'qr':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h2v2h-2zM18 14h3v3h-3zM14 18h2v3h-2zM18 18h1v1h-1zM20 18h1v3h-1z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
  }
};

export default CtsvNavIcon;
