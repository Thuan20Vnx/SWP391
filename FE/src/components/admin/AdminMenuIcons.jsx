const iconProps = {
  viewBox: '0 0 24 24',
  width: 22,
  height: 22,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const AdminMenuIcon = ({ type }) => {
  switch (type) {
    case 'dashboard':
      return (
        <svg {...iconProps}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4.5-5.5 7-5.5s5.5 2 7 5.5" />
        </svg>
      );
    case 'accounts':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M6 20v-1a6 6 0 0 1 12 0v1" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
      );
    case 'system':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    case 'data':
      return (
        <svg {...iconProps}>
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case 'analytics':
      return (
        <svg {...iconProps}>
          <path d="M4 19V5M10 19V9M16 19v-6M22 19H2" />
        </svg>
      );
    case 'partners':
      return (
        <svg {...iconProps}>
          <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
          <rect x="8" y="6" width="8" height="13" rx="1.5" />
          <path d="M11 12l2 2 4-4.5" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
        </svg>
      );
    case 'events':
      return (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'event-requests':
      return (
        <svg {...iconProps}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    default:
      return null;
  }
};
