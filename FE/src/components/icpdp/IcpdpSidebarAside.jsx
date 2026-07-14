import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import useNavBadges from '../../hooks/useNavBadges';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';
import {
  ICPDP_NAV_ITEMS,
  isIcpdpDesktop,
  isIcpdpNavActive
} from './icpdpNavConfig';

const IcpdpSidebarAside = ({
  sidebarOpen,
  onClose,
  userProfile,
  onLogout,
  pathname
}) => {
  const { badges, markRead } = useNavBadges();

  useEffect(() => {
    const active = ICPDP_NAV_ITEMS.find((it) => it.badgeKey && isIcpdpNavActive(it.path, pathname));
    if (active && badges[active.badgeKey]) markRead(active.badgeKey);
  }, [pathname, badges, markRead]);

  const renderNavItems = () => {
    const out = [];
    let lastSection = null;
    ICPDP_NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section icpdp-nav-section">
            {item.section}
          </p>
        );
      }
      const linkClass = isIcpdpNavActive(item.path, pathname)
        ? 'ctsv-nav-link icpdp-nav-link active'
        : 'ctsv-nav-link icpdp-nav-link';
      const showDot = item.badgeKey && badges[item.badgeKey] > 0;
      out.push(
        <Link
          key={`${item.path}-${item.label}`}
          to={item.path}
          className={linkClass}
          onClick={() => {
            if (item.badgeKey) markRead(item.badgeKey);
            if (!isIcpdpDesktop()) onClose?.();
          }}
        >
          <span className="ctsv-nav-icon">
            <CtsvNavIcon type={item.icon} />
          </span>
          <span className="ctsv-nav-label">{item.label}</span>
          {showDot && <span className="ctsv-nav-dot" aria-label="Có cập nhật mới" />}
        </Link>
      );
    });
    return out;
  };

  return (
    <aside className="ctsv-sidebar icpdp-sidebar" aria-hidden={!sidebarOpen}>
      <div className="ctsv-sidebar-header icpdp-sidebar-header">
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
      </div>
      <nav className="ctsv-sidebar-nav">{renderNavItems()}</nav>
      <div className="ctsv-sidebar-footer">
        <img src={userProfile.picture} alt="" className="ctsv-sidebar-avatar" />
        <div className="ctsv-sidebar-footer-text">
          <p className="ctsv-sidebar-user">{userProfile.fullname}</p>
          <p className="ctsv-sidebar-role">{getRoleDisplayLabel(getUserRole())}</p>
        </div>
      </div>
      <button type="button" className="ctsv-sidebar-logout icpdp-sidebar-logout" onClick={onLogout}>
        Đăng xuất
      </button>
    </aside>
  );
};

export default IcpdpSidebarAside;
