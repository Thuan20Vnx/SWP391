import React from 'react';
import defaultAvatar from '../../constants/defaultAvatar';

const Icon = ({ children, size = 18 }) => (
  <span className="nav-hub__icon" aria-hidden="true">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </span>
);

const NavItem = ({ icon, label, active, onClick }) => (
  <button type="button" className={`nav-hub__item ${active ? 'nav-hub__item--active' : ''}`} onClick={onClick}>
    {icon}
    <span className="nav-hub__item-label">{label}</span>
  </button>
);

const PartnerProfileMenu = ({
  activeItem = '',
  userProfile = null,
  roleLabel = 'Đối tác',
  onMenuAction,
  onLogout
}) => {
  const act = (key) => () => onMenuAction?.(key);

  return (
    <div className="nav-hub nav-hub--compact">
      <header className="nav-hub__header">
        <div className="nav-hub__avatar-wrap">
          <img src={userProfile?.picture || defaultAvatar} alt="" className="nav-hub__avatar" />
        </div>
        <div className="nav-hub__header-text">
          <h3 className="nav-hub__name">{userProfile?.fullname || 'Đối tác'}</h3>
          <p className="nav-hub__subtitle">{roleLabel}</p>
        </div>
      </header>

      <section className="nav-hub__section nav-hub__section--menu">
        <div className="nav-hub__group">
          <NavItem
            active={activeItem === 'profile'}
            label="Hồ sơ & Cài đặt"
            icon={
              <Icon>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </Icon>
            }
            onClick={act('profile')}
          />
          <NavItem
            active={activeItem === 'events'}
            label="Quản lý sự kiện"
            icon={
              <Icon>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </Icon>
            }
            onClick={act('events')}
          />
          <NavItem
            active={activeItem === 'contracts'}
            label="Hợp đồng"
            icon={
              <Icon>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </Icon>
            }
            onClick={act('contracts')}
          />
        </div>

        <button type="button" className="nav-hub__qr-btn partner-nav-hub-cta" onClick={act('create-proposal')}>
          <Icon size={16}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </Icon>
          <span>Tạo sự kiện mới</span>
        </button>
      </section>

      <footer className="nav-hub__footer">
        <button type="button" className="nav-hub__logout-btn" onClick={onLogout}>
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

export default PartnerProfileMenu;
