import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ClubPublicSidebar from '../components/club/ClubPublicSidebar';
import {
  persistClubPublicSidebarOpen,
  persistClubSidebarOpen,
  readClubPublicSidebarPref,
} from '../components/club/clubNavConfig';
import ChatbotFloating from '../components/ChatbotFloating';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import useUserProfile from '../hooks/useUserProfile';
import { API_BASE, getEventHeaders, parseApiResponse } from '../utils/api';
import { resolveStudentPublicActiveNav } from '../data/studentSidebarMenu';
import { resolvePublicShellSearchPlaceholder } from '../utils/publicShellSearch';

const mapMenuKeyToHeaderNav = (menuKey) => {
  if (menuKey === 'home') return 'home';
  if (menuKey === 'events') return 'events';
  if (menuKey === 'clubs') return 'clubs';
  if (menuKey === 'news') return 'news';
  return '';
};

const ClubParticipatePortalShell = ({
  children,
  activeNav: activeNavProp,
  searchPlaceholder,
  headerProps = {},
  showFooter = true,
  showChatbot = true,
  contentClassName = null,
}) => {
  const { pathname, state: locationState } = useLocation();
  const { userProfile } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (locationState?.keepSidebarOpen) return true;
    return readClubPublicSidebarPref();
  });
  const [clubEvents, setClubEvents] = useState([]);
  const [lastSeenNotifs, setLastSeenNotifs] = useState(() =>
    parseInt(localStorage.getItem('clb_last_seen_notifs') || '0', 10)
  );

  const resolvedActiveMenu = resolveStudentPublicActiveNav(pathname);
  const resolvedActiveNav = activeNavProp ?? mapMenuKeyToHeaderNav(resolvedActiveMenu);

  const shellHeaderProps = {
    activeNav: resolvedActiveNav,
    searchPlaceholder: resolvePublicShellSearchPlaceholder(resolvedActiveNav, searchPlaceholder),
    ...headerProps,
  };

  useEffect(() => {
    if (!locationState?.keepSidebarOpen) return;
    setSidebarOpen(true);
    persistClubPublicSidebarOpen(true);
    persistClubSidebarOpen(true);
  }, [locationState?.keepSidebarOpen]);

  useEffect(() => {
    const collapseOnMobile = () => {
      if (window.innerWidth > 900) return;
      setSidebarOpen(false);
      persistClubPublicSidebarOpen(false);
    };

    window.addEventListener('resize', collapseOnMobile);
    return () => window.removeEventListener('resize', collapseOnMobile);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/events/my`, { headers: getEventHeaders(false) })
      .then((res) => parseApiResponse(res))
      .then(({ ok, data }) => {
        if (ok && data.success && Array.isArray(data.events)) {
          setClubEvents(data.events);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const hasNewClubNotifs = useMemo(
    () =>
      clubEvents
        .filter((ev) => ev.status && ev.status !== 'draft')
        .some((ev) => {
          const raw = new Date(ev.updatedAt || ev.createdAt || 0).getTime();
          return raw > lastSeenNotifs;
        }),
    [clubEvents, lastSeenNotifs]
  );

  const markClubNotificationsRead = useCallback(() => {
    const now = Date.now();
    setLastSeenNotifs(now);
    localStorage.setItem('clb_last_seen_notifs', now.toString());
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      persistClubPublicSidebarOpen(next);
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    persistClubPublicSidebarOpen(false);
  }, []);

  const shellClass = `ctsv-app-shell club-app-shell club-public-shell${
    sidebarOpen ? ' sidebar-open' : ' sidebar-closed'
  }`;

  const mainContent = contentClassName ? (
    <div className={contentClassName}>{children}</div>
  ) : (
    children
  );

  return (
    <div className={shellClass}>
      {sidebarOpen && (
        <button
          type="button"
          className="ctsv-drawer-backdrop"
          onClick={closeSidebar}
          aria-label="Đóng menu"
        />
      )}
      <ClubPublicSidebar
        open={sidebarOpen}
        pathname={pathname}
        userProfile={userProfile}
        onClose={closeSidebar}
        hasNewNotifs={hasNewClubNotifs}
        onNotificationsRead={markClubNotificationsRead}
      />
      <div className="ctsv-shell-main">
        <SiteHeader
          {...shellHeaderProps}
          onTogglePortalSidebar={toggleSidebar}
          portalSidebarOpen={sidebarOpen}
        />
        {mainContent}
        {showFooter && <SiteFooter embedded />}
        {showChatbot && <ChatbotFloating context="club_manager" showQrFab />}
      </div>
    </div>
  );
};

export default ClubParticipatePortalShell;
