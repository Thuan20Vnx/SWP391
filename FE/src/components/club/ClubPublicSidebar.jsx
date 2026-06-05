import React from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import defaultAvatar from '../../constants/defaultAvatar';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';

const PUBLIC_NAV = [
  { key: 'home', label: 'Trang chủ', to: '/', icon: 'dashboard' },
  { key: 'events', label: 'Sự kiện', to: '/events', icon: 'publish' },
  { key: 'clubs', label: 'Câu lạc bộ', to: '/clubs', icon: 'participants' },
  { key: 'news', label: 'Tin tức', to: '/announcements', icon: 'announce' },
];

const isActive = (key, pathname) => {
  if (key === 'home') return pathname === '/';
  if (key === 'events') return pathname.startsWith('/events');
  if (key === 'clubs') return pathname.startsWith('/clubs');
  if (key === 'news') return pathname.startsWith('/announcements');
  if (key === 'club-manage') return pathname.startsWith('/quan-ly-clb');
  return false;
};

const ClubPublicSidebar = ({ open, pathname, userProfile, onClose }) => (
  <aside className="ctsv-sidebar club-sidebar club-public-sidebar" aria-hidden={!open}>
    <div className="ctsv-sidebar-header"><img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" /></div>
    <nav className="ctsv-sidebar-nav">
      <p className="ctsv-nav-section">KHÁM PHÁ</p>
      {PUBLIC_NAV.map((item) => (
        <Link key={item.key} to={item.to} className={`ctsv-nav-link club-nav-link${isActive(item.key, pathname) ? ' active' : ''}`} onClick={onClose}>
          <span className="ctsv-nav-icon"><CtsvNavIcon type={item.icon} /></span>
          <span className="ctsv-nav-label">{item.label}</span>
        </Link>
      ))}
      <p className="ctsv-nav-section">QUẢN LÝ</p>
      <Link to="/quan-ly-clb" className={`ctsv-nav-link club-nav-link${isActive('club-manage', pathname) ? ' active' : ''}`} onClick={onClose}>
        <span className="ctsv-nav-icon"><CtsvNavIcon type="profile" /></span>
        <span className="ctsv-nav-label">Quản lý CLB</span>
      </Link>
    </nav>
    <div className="ctsv-sidebar-footer">
      <img src={userProfile?.picture || defaultAvatar} alt="" className="ctsv-sidebar-avatar" />
      <div className="ctsv-sidebar-footer-text">
        <p className="ctsv-sidebar-user">{userProfile?.fullname || 'Quản lý CLB'}</p>
        <p className="ctsv-sidebar-role">{getRoleDisplayLabel(getUserRole())}</p>
      </div>
    </div>
  </aside>
);

export default ClubPublicSidebar;
