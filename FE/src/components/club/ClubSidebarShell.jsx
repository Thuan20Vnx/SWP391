import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import { getRoleDisplayLabel, getUserRole } from '../../utils/auth';
import {
  CLUB_SIDEBAR_MODE,
  inferClubSidebarMode,
  isClubDesktop,
  navigateClubPortalHome,
  persistClubSidebarMode,
  persistClubSidebarOpen,
  persistClubPublicSidebarOpen,
  readClubSidebarMode,
} from './clubNavConfig';
import ClubParticipateSidebarNav from './ClubParticipateSidebarNav';
import ClubSidebarFooter from './ClubSidebarFooter';
import ClubSidebarModeSwitch from './ClubSidebarModeSwitch';
import ClubSidebarNav from './ClubSidebarNav';

const ClubSidebarShell = ({
  open,
  asideClassName = 'ctsv-sidebar club-sidebar',
  userProfile,
  onClose,
  activeNav,
  onNavSelect,
  hasNewNotifs = false,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mode, setMode] = useState(() => readClubSidebarMode(pathname));

  useEffect(() => {
    const next = inferClubSidebarMode(pathname);
    setMode((prev) => {
      if (prev === next) return prev;
      persistClubSidebarMode(next);
      return next;
    });
  }, [pathname]);

  const closeOnMobile = useCallback(() => {
    if (!isClubDesktop()) onClose?.();
  }, [onClose]);

  const handleModeChange = useCallback(
    (nextMode) => {
      persistClubSidebarMode(nextMode);
      setMode(nextMode);

      if (nextMode === CLUB_SIDEBAR_MODE.MANAGE && !pathname.startsWith('/quan-ly-clb')) {
        navigateClubPortalHome(navigate, pathname, { keepSidebarOpen: open });
      } else if (nextMode === CLUB_SIDEBAR_MODE.PARTICIPATE && pathname.startsWith('/quan-ly-clb')) {
        if (open) {
          persistClubSidebarOpen(true);
          persistClubPublicSidebarOpen(true);
        }
        navigate('/', { state: open ? { keepSidebarOpen: true } : undefined });
      }
    },
    [navigate, open, pathname]
  );

  const picture = userProfile?.picture || '';
  const fullname = userProfile?.fullname || 'Quản lý CLB';
  const roleLabel = getRoleDisplayLabel(getUserRole());

  return (
    <aside className={asideClassName} aria-hidden={!open}>
      <div className="ctsv-sidebar-header">
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
      </div>
      <nav className="ctsv-sidebar-nav">
        <ClubSidebarModeSwitch mode={mode} onModeChange={handleModeChange} />
        {mode === CLUB_SIDEBAR_MODE.MANAGE ? (
          <ClubSidebarNav
            embedded
            activeNav={activeNav}
            onNavSelect={onNavSelect}
            hasNewNotifs={hasNewNotifs}
          />
        ) : (
          <ClubParticipateSidebarNav onItemSelect={closeOnMobile} />
        )}
      </nav>
      <ClubSidebarFooter picture={picture} fullname={fullname} roleLabel={roleLabel} />
    </aside>
  );
};

export default ClubSidebarShell;
