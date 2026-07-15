import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import useNavBadges from '../../hooks/useNavBadges';
import CtsvNavIcon from '../ctsv/CtsvNavIcon';
import ClubParticipateSidebarNav from '../club/ClubParticipateSidebarNav';
import PartnerSidebarModeSwitch from './PartnerSidebarModeSwitch';
import {
  PARTNER_NAV_ITEMS,
  isPartnerDesktop,
  isPartnerNavActive,
  persistPartnerSidebarMode
} from './partnerNavConfig';

const PartnerSidebarAside = ({
  sidebarOpen,
  onClose,
  userProfile,
  pathname,
  onLogout
}) => {
  const { badges, markRead } = useNavBadges();
  const navigate = useNavigate();
  const mode = pathname.startsWith('/partner') ? 'partner' : 'participate';

  // Ở trong cổng đối tác thì luôn coi là chế độ 'partner' (reset cờ), để trang chủ
  // đẩy về /partner như mặc định — trừ khi người dùng chủ động bấm "Tham gia sự kiện".
  useEffect(() => {
    if (pathname.startsWith('/partner')) persistPartnerSidebarMode('partner');
  }, [pathname]);

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return;
    if (!isPartnerDesktop()) onClose?.();
    persistPartnerSidebarMode(nextMode);
    // "Tham gia sự kiện" → trải nghiệm khách ở trang công khai; "Đối tác" → cổng partner.
    navigate(nextMode === 'participate' ? '/' : '/partner');
  };

  useEffect(() => {
    const active = PARTNER_NAV_ITEMS.find((it) => it.badgeKey && isPartnerNavActive(it.path, pathname));
    if (active && badges[active.badgeKey]) markRead(active.badgeKey);
  }, [pathname, badges, markRead]);

  const renderNavItems = () => {
    const out = [];
    let lastSection = null;
    PARTNER_NAV_ITEMS.forEach((item) => {
      if (item.section && item.section !== lastSection) {
        lastSection = item.section;
        out.push(
          <p key={`sec-${item.section}`} className="ctsv-nav-section partner-nav-section">
            {item.section}
          </p>
        );
      }
      const linkClass = isPartnerNavActive(item.path, pathname)
        ? 'ctsv-nav-link partner-nav-link active'
        : 'ctsv-nav-link partner-nav-link';
      const showDot = item.badgeKey && badges[item.badgeKey] > 0;
      out.push(
        <Link
          key={item.path}
          to={item.path}
          className={linkClass}
          onClick={() => {
            if (item.badgeKey) markRead(item.badgeKey);
            if (!isPartnerDesktop()) onClose?.();
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
    <aside className="ctsv-sidebar partner-sidebar" aria-hidden={!sidebarOpen}>
      <div className="ctsv-sidebar-header partner-sidebar-header">
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
      </div>
      <nav className="ctsv-sidebar-nav">
        <PartnerSidebarModeSwitch mode={mode} onModeChange={handleModeChange} />
        {mode === 'partner' ? renderNavItems() : (
          <ClubParticipateSidebarNav onItemSelect={() => { if (!isPartnerDesktop()) onClose?.(); }} />
        )}
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

export default PartnerSidebarAside;
