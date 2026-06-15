import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSidebarMenuSections, isStudentSidebarItemActive } from '../data/studentSidebarMenu';
import { getUserRole } from '../utils/auth';

const MenuIcon = ({ type }) => {
  const props = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (type) {
    case 'folder':
      return (
        <svg {...props}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'star':
      return (
        <svg {...props}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...props}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
        </svg>
      );
    case 'ticket':
      return (
        <svg {...props}>
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
          <line x1="9" y1="9" x2="9" y2="15" />
        </svg>
      );
    case 'news':
      return (
        <svg {...props}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="16" y2="11" />
        </svg>
      );
    case 'user':
    default:
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
  }
};

const DashboardSidebarNav = ({
  activeMenu,
  onScanClick,
  onCloseSidebar,
  onProfileMenuItem,
  onNavigate,
}) => {
  const { pathname } = useLocation();
  const sections = getSidebarMenuSections(getUserRole());

  const isItemActive = (item) =>
    activeMenu === item.key || isStudentSidebarItemActive(item.key, pathname);

  const handleItemClick = (item) => (event) => {
    event.preventDefault();

    if (onProfileMenuItem && (item.inPage || item.key === 'profile')) {
      onProfileMenuItem(item.key, event);
      onCloseSidebar?.();
      return;
    }

    if (onNavigate) {
      onNavigate(item.path);
      onCloseSidebar?.();
      return;
    }
  };

  return (
    <nav className="sidebar-menu">
      {sections.map((section) => (
        <div className="menu-section" key={section.header || 'main'}>
          {section.header && <span className="menu-header">{section.header}</span>}
          {section.items.map((item) => {
            const className = `menu-item ${isItemActive(item) ? 'active' : ''}`;

            if (onNavigate) {
              return (
                <a
                  key={item.key}
                  href={item.path}
                  className={className}
                  onClick={handleItemClick(item)}
                >
                  <div className="menu-item-content">
                    <MenuIcon type={item.icon} />
                    <span>{item.label}</span>
                  </div>
                </a>
              );
            }

            return (
              <Link
                key={item.key}
                to={item.path}
                className={className}
                onClick={() => onCloseSidebar?.()}
              >
                <div className="menu-item-content">
                  <MenuIcon type={item.icon} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ))}

      <button type="button" className="btn-scan-aside" onClick={onScanClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M21 14v4h-4" />
        </svg>
        <span>Check-in tại sự kiện</span>
      </button>
    </nav>
  );
};

export default DashboardSidebarNav;
