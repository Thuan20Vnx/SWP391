import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ChatbotFloating from '../components/ChatbotFloating';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import StudentPortalSidebarAside from '../components/student/StudentPortalSidebarAside';
import {
  isStudentDesktop,
  persistStudentPublicSidebarOpen,
  readStudentPublicSidebarPref,
} from '../components/student/studentNavConfig';
import { useClubParticipateLayout } from '../context/ClubParticipateLayoutContext';
import { resolveStudentPublicActiveNav } from '../data/studentSidebarMenu';
import useUserProfile from '../hooks/useUserProfile';
import { isClubManagerRole } from '../utils/auth';
import { resolvePublicShellSearchPlaceholder } from '../utils/publicShellSearch';

const mapMenuKeyToHeaderNav = (menuKey) => {
  if (menuKey === 'home') return 'home';
  if (menuKey === 'events') return 'events';
  if (menuKey === 'clubs') return 'clubs';
  if (menuKey === 'news') return 'news';
  return '';
};

const StudentPortalShell = ({
  children,
  activeMenu,
  activeNav,
  pageTitle,
  pageSubtitle,
  searchPlaceholder,
  contentClassName = 'dashboard-content-wrapper',
  showFooter = true,
  showChatbot = true,
  onProfileMenuItem,
  headerProps = {},
}) => {
  const { pathname } = useLocation();
  const { userProfile } = useUserProfile();
  const inClubParticipateLayout = useClubParticipateLayout();
  const [sidebarOpen, setSidebarOpen] = useState(readStudentPublicSidebarPref);

  const resolvedActiveMenu = activeMenu ?? resolveStudentPublicActiveNav(pathname);
  const resolvedActiveNav = activeNav ?? mapMenuKeyToHeaderNav(resolvedActiveMenu);

  const shellHeaderProps = {
    activeNav: resolvedActiveNav,
    searchPlaceholder: resolvePublicShellSearchPlaceholder(resolvedActiveNav, searchPlaceholder),
    ...headerProps,
  };

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      persistStudentPublicSidebarOpen(next);
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    persistStudentPublicSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || isStudentDesktop()) {
      document.body.style.overflow = '';
      return undefined;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const content = (
    <>
      {(pageTitle || pageSubtitle) && (
        <div className="page-header">
          {pageTitle && <h1>{pageTitle}</h1>}
          {pageSubtitle && <p>{pageSubtitle}</p>}
        </div>
      )}
      {children}
    </>
  );

  if (isClubManagerRole() && inClubParticipateLayout) {
    return contentClassName ? (
      <div className={contentClassName}>{content}</div>
    ) : (
      content
    );
  }

  return (
    <div
      className={`profile-page student-portal student-public-portal${
        sidebarOpen ? ' student-public-portal--sidebar-open' : ' student-public-portal--sidebar-closed'
      }`}
    >
      {sidebarOpen && !isStudentDesktop() && (
        <div className="sidebar-overlay active" onClick={closeSidebar} aria-hidden="true" />
      )}
      <div className="dashboard-container">
        <StudentPortalSidebarAside
          sidebarActive={sidebarOpen}
          activeMenu={resolvedActiveMenu}
          userProfile={userProfile}
          onCloseSidebar={closeSidebar}
          onProfileMenuItem={onProfileMenuItem}
        />
        <main className="dashboard-main student-public-main">
          <SiteHeader
            {...shellHeaderProps}
            onTogglePortalSidebar={toggleSidebar}
            portalSidebarOpen={sidebarOpen}
          />
          {contentClassName ? (
            <div className={contentClassName}>{content}</div>
          ) : (
            content
          )}
          {showFooter && <SiteFooter embedded />}
          {showChatbot && <ChatbotFloating context="home" showQrFab />}
        </main>
      </div>
    </div>
  );
};

export default StudentPortalShell;
