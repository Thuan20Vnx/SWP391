import React from 'react';
import defaultAvatar from '../../constants/defaultAvatar';
import { useTranslation } from '../../i18n/I18nContext';

export const NavHubIcon = ({ children, size = 18 }) => (
  <span className="nav-hub__icon" aria-hidden="true">
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  </span>
);

export const NavHubItem = ({ icon, label, hint, active, variant, onClick }) => (
  <button
    type="button"
    className={`nav-hub__item ${active ? 'nav-hub__item--active' : ''} ${variant ? `nav-hub__item--${variant}` : ''}`}
    onClick={onClick}
  >
    {icon}
    <span className="nav-hub__item-text">
      <span className="nav-hub__item-label">{label}</span>
      {hint ? <span className="nav-hub__item-hint">{hint}</span> : null}
    </span>
  </button>
);

export const NavHubHeader = ({ userProfile, fallbackName, roleLabel }) => (
  <header className="nav-hub__header">
    <div className="nav-hub__avatar-wrap">
      <img src={userProfile?.picture || defaultAvatar} alt="" className="nav-hub__avatar" />
    </div>
    <div className="nav-hub__header-text">
      <h3 className="nav-hub__name">{userProfile?.fullname || fallbackName}</h3>
      {roleLabel ? <p className="nav-hub__subtitle">{roleLabel}</p> : null}
    </div>
  </header>
);

export const NavHubMenuSection = ({ title, items = [], cta = null }) => {
  const { t } = useTranslation();
  const sectionTitle = title ?? t('navHub.quickAccess');
  return (
    <section className="nav-hub__section nav-hub__section--menu" aria-label={sectionTitle}>
      <p className="nav-hub__section-title">{sectionTitle}</p>
      <div className="nav-hub__group">{items}</div>
      {cta}
    </section>
  );
};

export const NavHubCtaButton = ({ icon, label, hint, badge, className = '', onClick }) => (
  <button
    type="button"
    className={`nav-hub__qr-btn${hint ? ' nav-hub__qr-btn--detailed' : ''} ${className}`.trim()}
    onClick={onClick}
  >
    {icon}
    {hint ? (
      <span className="nav-hub__qr-btn-text">
        <span className="nav-hub__qr-btn-label">{label}</span>
        <span className="nav-hub__item-hint">{hint}</span>
      </span>
    ) : (
      <span>{label}</span>
    )}
    {badge != null && Number(badge) > 0 ? (
      <span className="nav-hub__badge">{Number(badge) > 99 ? '99+' : badge}</span>
    ) : null}
  </button>
);

export const NavHubSystemSection = ({ items = [] }) => {
  const { t } = useTranslation();
  const title = t('navHub.system');
  return (
    <section className="nav-hub__section nav-hub__section--system" aria-label={title}>
      <p className="nav-hub__section-title">{title}</p>
      <div className="nav-hub__group">{items}</div>
    </section>
  );
};

export const NavHubFooter = ({ onLogout }) => {
  const { t } = useTranslation();
  return (
    <footer className="nav-hub__footer">
      <button type="button" className="nav-hub__logout-btn" onClick={onLogout}>
        <NavHubIcon>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </NavHubIcon>
        <span>{t('profile.menu.logout')}</span>
      </button>
    </footer>
  );
};

/** Icon paths dùng chung */
export const navIcons = {
  profile: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  clubs: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  partners: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
    </>
  ),
  proposals: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  events: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  contract: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  ecosystem: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M21 14v4h-4" />
    </>
  ),
  switchClub: (
    <>
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M21 8l-7 7" />
      <path d="M3 16l7-7" />
    </>
  ),
};
