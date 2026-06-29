import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';
import { isStudentSidebarItemActive, studentMenuSections } from '../../data/studentSidebarMenu';

const mapStudentIcon = (icon) => {
  switch (icon) {
    case 'news':
      return 'announce';
    case 'settings':
      return 'system';
    case 'user':
      return 'profile';
    case 'users':
      return 'participants';
    default:
      return icon;
  }
};

const ClubParticipateSidebarNav = ({ onItemSelect }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
    onItemSelect?.();
  };

  const items = [];

  studentMenuSections.forEach((section) => {
    if (section.header) {
      items.push(
        <p key={`sec-${section.header}`} className="ctsv-nav-section">
          {section.header}
        </p>
      );
    }

    section.items.forEach((item) => {
      const active = isStudentSidebarItemActive(item.key, pathname);
      items.push(
        <button
          key={item.key}
          type="button"
          className={active ? 'ctsv-nav-link active' : 'ctsv-nav-link'}
          onClick={() => handleNavigate(item.path)}
        >
          <span className="ctsv-nav-icon">
            <CtsvNavIcon type={mapStudentIcon(item.icon)} />
          </span>
          <span className="ctsv-nav-label">
            <span className="ctsv-nav-label__full">{item.label}</span>
            <span className="ctsv-nav-label__short">{item.label}</span>
          </span>
        </button>
      );
    });
  });

  items.push(
    <button
      key="scan"
      type="button"
      className={`ctsv-nav-link club-sidebar-scan-btn${
        pathname === '/quet-qr' ? ' active' : ''
      }`}
      onClick={() => handleNavigate('/quet-qr')}
    >
      <span className="ctsv-nav-icon">
        <CtsvNavIcon type="qr" />
      </span>
      <span className="ctsv-nav-label">
        <span className="ctsv-nav-label__full">Check-in tại sự kiện</span>
        <span className="ctsv-nav-label__short">Check-in</span>
      </span>
    </button>
  );

  return items;
};

export default ClubParticipateSidebarNav;
