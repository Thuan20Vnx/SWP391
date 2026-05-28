import React from 'react';
import defaultAvatar from '../constants/defaultAvatar';

const Icon = ({ children, size = 18 }) => (
  <span className="nav-hub__icon" aria-hidden="true">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </span>
);

const NavItem = ({ icon, label, active, variant, onClick }) => (
  <button
    type="button"
    className={`nav-hub__item ${active ? 'nav-hub__item--active' : ''} ${variant ? `nav-hub__item--${variant}` : ''}`}
    onClick={onClick}
  >
    {icon}
    <span className="nav-hub__item-label">{label}</span>
  </button>
);

const ProfileSidebarMenu = ({
  activeItem = '',
  userProfile = null,
  onMenuAction,
  onLogout
}) => {
  const handleAction = (action, label) => {
    onMenuAction(action, label);
  };

  return (
    <div className="nav-hub nav-hub--compact">
      <header className="nav-hub__header">
        <div className="nav-hub__avatar-wrap">
          <img
            src={userProfile?.picture || defaultAvatar}
            alt=""
            className="nav-hub__avatar"
          />
        </div>
        <div className="nav-hub__header-text">
          <h3 className="nav-hub__name">{userProfile?.fullname || 'Người dùng'}</h3>
        </div>
      </header>

      <section className="nav-hub__section nav-hub__section--menu">
        <div className="nav-hub__group">
          <NavItem
            active={activeItem === 'profile'}
            label="Thông tin cá nhân"
            icon={
              <Icon>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </Icon>
            }
            onClick={() => handleAction('profile', 'Thông tin cá nhân')}
          />
          <NavItem
            active={activeItem === 'schedule'}
            label="Lịch trình cá nhân"
            icon={
              <Icon>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </Icon>
            }
            onClick={() => handleAction('schedule', 'Lịch trình cá nhân')}
          />
        </div>

        <button
          type="button"
          className="nav-hub__qr-btn"
          onClick={() => handleAction('scan', 'Quét QR Check-in')}
        >
          <Icon size={16}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h.01" />
            <path d="M18 14h.01" />
            <path d="M14 18h.01" />
            <path d="M18 18h.01" />
            <path d="M21 14v4h-4" />
          </Icon>
          <span>Quét QR Check-in</span>
        </button>
      </section>

      <section className="nav-hub__section nav-hub__section--system">
        <div className="nav-hub__group">
          <NavItem
            active={activeItem === 'settings'}
            label="Cài đặt"
            icon={
              <Icon>
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </Icon>
            }
            onClick={() => handleAction('settings', 'Cài đặt')}
          />
        </div>
      </section>

      <footer className="nav-hub__footer">
        <button
          type="button"
          className="nav-hub__logout-btn"
          onClick={onLogout}
        >
          <Icon>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </Icon>
          <span>Đăng xuất</span>
        </button>
      </footer>
    </div>
  );
};

export default ProfileSidebarMenu;
