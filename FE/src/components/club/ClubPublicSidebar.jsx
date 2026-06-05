import React from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import defaultAvatar from '../../constants/defaultAvatar';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';

const isClubManageActive = (pathname) => pathname.startsWith('/quan-ly-clb');

const ClubPublicSidebar = ({ open, pathname, userProfile, onClose }) => (
  <aside className="ctsv-sidebar club-sidebar club-public-sidebar" aria-hidden={!open}>
    <div className="ctsv-sidebar-header"><img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" /></div>
    <nav className="ctsv-sidebar-nav">
      <p className="ctsv-nav-section">QUẢN LÝ</p>
      <Link to="/quan-ly-clb" className={`ctsv-nav-link${isClubManageActive(pathname) ? ' active' : ''}`} onClick={onClose}>
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
