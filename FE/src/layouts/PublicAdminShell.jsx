import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopHeader from '../components/admin/AdminTopHeader';
import CtsvPublicSidebar from '../components/ctsv/CtsvPublicSidebar';
import {
  persistSidebarOpen as persistCtsvSidebarOpen,
  readSidebarPref as readCtsvSidebarPref,
} from '../components/ctsv/ctsvNavConfig';
import PartnerSidebarAside from '../components/partner/PartnerSidebarAside';
import {
  persistPartnerSidebarOpen,
  readPartnerSidebarPref,
} from '../components/partner/partnerNavConfig';
import StudentPortalShell from '../layouts/StudentPortalShell';
import ClubParticipatePortalShell from '../layouts/ClubParticipatePortalShell';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import ChatbotFloating from '../components/ChatbotFloating';
import useUserProfile from '../hooks/useUserProfile';
import { useClubParticipateLayout } from '../context/ClubParticipateLayoutContext';
import { getUserRole, isAdminRole, isClubManagerRole, isPartnerRole, normalizeRole, USER_ROLES } from '../utils/auth';
import { readSidebarPref, writeSidebarPref } from '../utils/adminSidebarStorage';
import { resolvePublicShellSearchPlaceholder } from '../utils/publicShellSearch';
import '../styles/admin-menu.css';
import '../styles/club-portal.css';
import '../styles/partner-portal.css';

const PublicAdminShell = ({ children, ...headerProps }) => {
  const shellHeaderProps = {
    ...headerProps,
    searchPlaceholder: resolvePublicShellSearchPlaceholder(
      headerProps.activeNav,
      headerProps.searchPlaceholder,
    ),
  };
  const { pathname } = useLocation();
  const { isLoggedIn, userProfile } = useUserProfile();
  const inClubParticipateLayout = useClubParticipateLayout();
  const role = normalizeRole(userProfile.role || getUserRole());
  const showAdminMenu = isLoggedIn && isAdminRole(role);
  const showClubShell = isLoggedIn && isClubManagerRole(role) && !showAdminMenu;
  const showCtsvShell = isLoggedIn && role === USER_ROLES.CTSV && !showAdminMenu;
  // Partner kế thừa Guest: ở trang công khai vẫn giữ sidebar đối tác để có nút
  // chuyển chế độ "Đối tác" / "Tham gia sự kiện".
  const showPartnerShell = isLoggedIn && isPartnerRole(role) && !showAdminMenu;

  const showStudentShell =
    isLoggedIn &&
    (role === USER_ROLES.STUDENT || role === USER_ROLES.GUEST) &&
    !showAdminMenu &&
    !showClubShell &&
    !showCtsvShell &&
    !showPartnerShell;

  const [adminSidebarOpen, setAdminSidebarOpen] = useState(readSidebarPref);
  const [ctsvSidebarOpen, setCtsvSidebarOpen] = useState(readCtsvSidebarPref);
  const [partnerSidebarOpen, setPartnerSidebarOpen] = useState(readPartnerSidebarPref);

  useEffect(() => {
    const collapseShellOnMobile = () => {
      if (window.innerWidth > 900) return;
      setAdminSidebarOpen(false);
      setCtsvSidebarOpen(false);
      setPartnerSidebarOpen(false);
      writeSidebarPref(false);
      persistCtsvSidebarOpen(false);
      persistPartnerSidebarOpen(false);
    };

    collapseShellOnMobile();
    window.addEventListener('resize', collapseShellOnMobile);
    return () => window.removeEventListener('resize', collapseShellOnMobile);
  }, []);

  const toggleAdminSidebar = useCallback(() => {
    setAdminSidebarOpen((prev) => {
      const next = !prev;
      writeSidebarPref(next);
      return next;
    });
  }, []);
  const closeAdminSidebar = useCallback(() => {
    setAdminSidebarOpen(false);
    writeSidebarPref(false);
  }, []);
  const toggleCtsvSidebar = useCallback(() => {
    setCtsvSidebarOpen((prev) => {
      const next = !prev;
      persistCtsvSidebarOpen(next);
      return next;
    });
  }, []);
  const closeCtsvSidebar = useCallback(() => {
    setCtsvSidebarOpen(false);
    persistCtsvSidebarOpen(false);
  }, []);
  const togglePartnerSidebar = useCallback(() => {
    setPartnerSidebarOpen((prev) => {
      const next = !prev;
      persistPartnerSidebarOpen(next);
      return next;
    });
  }, []);
  const closePartnerSidebar = useCallback(() => {
    setPartnerSidebarOpen(false);
    persistPartnerSidebarOpen(false);
  }, []);

  if (showClubShell && inClubParticipateLayout) {
    return children;
  }

  if (showStudentShell) {
    return (
      <StudentPortalShell
        activeNav={shellHeaderProps.activeNav}
        headerProps={shellHeaderProps}
        contentClassName={null}
      >
        {children}
      </StudentPortalShell>
    );
  }

  if (showPartnerShell) {
    const shellClass = `ctsv-app-shell partner-app-shell partner-public-shell${
      partnerSidebarOpen ? ' sidebar-open' : ' sidebar-closed'
    }`;
    return (
      <div className={shellClass}>
        {partnerSidebarOpen && (
          <button
            type="button"
            className="ctsv-drawer-backdrop"
            onClick={closePartnerSidebar}
            aria-label="Đóng menu"
          />
        )}
        <PartnerSidebarAside
          sidebarOpen={partnerSidebarOpen}
          onClose={closePartnerSidebar}
          userProfile={userProfile}
          pathname={pathname}
        />
        <div className="ctsv-shell-main">
          <SiteHeader
            {...shellHeaderProps}
            onTogglePortalSidebar={togglePartnerSidebar}
            portalSidebarOpen={partnerSidebarOpen}
          />
          {children}
          <SiteFooter embedded />
          <ChatbotFloating context="home" showQrFab />
        </div>
      </div>
    );
  }

  if (!showAdminMenu && !showClubShell && !showCtsvShell) {
    return (
      <>
        <SiteHeader {...shellHeaderProps} />
        {children}
        <SiteFooter />
        <ChatbotFloating context="home" showQrFab />
      </>
    );
  }

  if (showClubShell) {
    return (
      <ClubParticipatePortalShell
        activeNav={shellHeaderProps.activeNav}
        searchPlaceholder={shellHeaderProps.searchPlaceholder}
        headerProps={shellHeaderProps}
        contentClassName={null}
      >
        {children}
      </ClubParticipatePortalShell>
    );
  }

  if (showCtsvShell) {
    const shellClass = `ctsv-app-shell ctsv-public-shell${
      ctsvSidebarOpen ? ' sidebar-open' : ' sidebar-closed'
    }`;
    return (
      <div className={shellClass}>
        {ctsvSidebarOpen && (
          <button
            type="button"
            className="ctsv-drawer-backdrop"
            onClick={closeCtsvSidebar}
            aria-label="Đóng menu"
          />
        )}
        <CtsvPublicSidebar
          open={ctsvSidebarOpen}
          pathname={pathname}
          userProfile={userProfile}
          onClose={closeCtsvSidebar}
        />
        <div className="ctsv-shell-main">
          <SiteHeader
            {...shellHeaderProps}
            onTogglePortalSidebar={toggleCtsvSidebar}
            portalSidebarOpen={ctsvSidebarOpen}
          />
          {children}
          <SiteFooter embedded />
        </div>
      </div>
    );
  }

  const shellClass = `ctsv-app-shell admin-app-shell admin-public-shell${
    adminSidebarOpen ? ' sidebar-open' : ' sidebar-closed'
  }`;
  return (
    <div className={shellClass}>
      {adminSidebarOpen && (
        <button
          type="button"
          className="ctsv-drawer-backdrop admin-sidebar-backdrop"
          onClick={closeAdminSidebar}
          aria-label="Đóng menu"
        />
      )}
      <AdminSidebar open={adminSidebarOpen} onClose={closeAdminSidebar} pathname={pathname} userProfile={userProfile} />
      <div className="ctsv-shell-main admin-shell-main public-shell-main">
        <AdminTopHeader {...shellHeaderProps} sidebarToggle={toggleAdminSidebar} sidebarOpen={adminSidebarOpen} />
        {children}
      </div>
    </div>
  );
};

export default PublicAdminShell;
