import React from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';
import {
  isStudentDesktop,
  isStudentNavActive,
  STUDENT_NAV_ITEMS,
} from './studentNavConfig';

const CheckInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M21 14v4h-4" />
  </svg>
);

const StudentSidebarAside = ({
  sidebarOpen,
  onClose,
  userProfile,
  pathname,
}) => {
  const renderNavItems = () => {
    const out = [];
    let lastSection = null;

    STUDENT_NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section">
            {item.section}
          </p>
        );
      }

      const linkClass = isStudentNavActive(item.path, pathname)
        ? 'ctsv-nav-link active'
        : 'ctsv-nav-link';

      out.push(
        <Link
          key={item.path}
          to={item.path}
          className={linkClass}
          onClick={() => {
            if (!isStudentDesktop()) onClose?.();
          }}
        >
          <span className="ctsv-nav-icon">
            <CtsvNavIcon type={item.icon} />
          </span>
          <span className="ctsv-nav-label">{item.label}</span>
        </Link>
      );
    });

    return out;
  };

  const closeOnNavigate = () => {
    if (!isStudentDesktop()) onClose?.();
  };

  return (
    <aside className="ctsv-sidebar student-sidebar" aria-hidden={!sidebarOpen}>
      <div className="ctsv-sidebar-header">
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
      </div>

      <nav className="ctsv-sidebar-nav">
        {renderNavItems()}
        <Link
          to="/quet-qr"
          className={`student-sidebar-checkin${
            pathname === '/quet-qr' ? ' student-sidebar-checkin--active' : ''
          }`}
          onClick={closeOnNavigate}
        >
          <CheckInIcon />
          <span>Check-in tại sự kiện</span>
        </Link>
      </nav>

      <div className="ctsv-sidebar-footer">
        <img src={userProfile.picture} alt="" className="ctsv-sidebar-avatar" />
        <div className="ctsv-sidebar-footer-text">
          <p className="ctsv-sidebar-user">{userProfile.fullname}</p>
          <p className="ctsv-sidebar-role">{getRoleDisplayLabel(getUserRole())}</p>
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebarAside;
