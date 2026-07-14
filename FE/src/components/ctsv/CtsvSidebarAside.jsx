import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import useNavBadges from '../../hooks/useNavBadges';
import CtsvNavIcon from './CtsvNavIcon';
import {
  CTSV_NAV_ITEMS,
  isCtsvDesktop,
  isCtsvNavActive
} from './ctsvNavConfig';

const CtsvSidebarAside = ({
  sidebarOpen,
  onClose,
  userProfile,
  pathname,
  onLogout
}) => {
  const { badges, markRead } = useNavBadges();

  useEffect(() => {
    const active = CTSV_NAV_ITEMS.find((it) => it.badgeKey && isCtsvNavActive(it.path, pathname));
    if (active && badges[active.badgeKey]) markRead(active.badgeKey);
  }, [pathname, badges, markRead]);

  const renderNavItems = () => {
    const out = [];
    let lastSection = null;
    CTSV_NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section">
            {item.section}
          </p>
        );
      }
      const linkClass = isCtsvNavActive(item.path, pathname)
        ? 'ctsv-nav-link active'
        : 'ctsv-nav-link';
      const showDot = item.badgeKey && badges[item.badgeKey] > 0;
      out.push(
        <Link
          key={item.path}
          to={item.path}
          className={linkClass}
          onClick={() => {
            if (item.badgeKey) markRead(item.badgeKey);
            if (!isCtsvDesktop()) onClose?.();
          }}
        >
          <span className="ctsv-nav-icon">
            <CtsvNavIcon type={item.icon} />
          </span>
          <span className="ctsv-nav-label">
            <span className="ctsv-nav-label__full">{item.label}</span>
            <span className="ctsv-nav-label__short">{item.mobileLabel || item.label}</span>
          </span>
          {showDot && <span className="ctsv-nav-dot" aria-label="Có cập nhật mới" />}
        </Link>
      );
    });
    return out;
  };

  return (
    <aside className="ctsv-sidebar" aria-hidden={!sidebarOpen}>
      <div className="ctsv-sidebar-header">
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
    </aside>
  );
};

export default CtsvSidebarAside;
