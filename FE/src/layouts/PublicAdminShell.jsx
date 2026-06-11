import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopHeader from '../components/admin/AdminTopHeader';
import ClubPublicSidebar from '../components/club/ClubPublicSidebar';
import CtsvPublicSidebar from '../components/ctsv/CtsvPublicSidebar';
import { persistClubPublicSidebarOpen, readClubPublicSidebarPref } from '../components/club/clubNavConfig';
import {
  persistSidebarOpen as persistCtsvSidebarOpen,
  readSidebarPref as readCtsvSidebarPref,
} from '../components/ctsv/ctsvNavConfig';
import SiteHeader from '../components/SiteHeader';
import useUserProfile from '../hooks/useUserProfile';
import { API_BASE, getEventHeaders, parseApiResponse } from '../utils/api';
import { getUserRole, isAdminRole, isClubManagerRole, normalizeRole, USER_ROLES } from '../utils/auth';
import { readSidebarPref, writeSidebarPref } from '../utils/adminSidebarStorage';
import '../styles/admin-menu.css';
import '../styles/club-portal.css';

const PublicAdminShell = ({ children, ...headerProps }) => {
  const { pathname } = useLocation();
  const { isLoggedIn, userProfile } = useUserProfile();
  const role = normalizeRole(userProfile.role || getUserRole());
  const showAdminMenu = isLoggedIn && isAdminRole(role);
  const showClubShell = isLoggedIn && isClubManagerRole(role) && !showAdminMenu;
  const showCtsvShell = isLoggedIn && role === USER_ROLES.CTSV && !showAdminMenu;

  const [adminSidebarOpen, setAdminSidebarOpen] = useState(readSidebarPref);
  const [clubSidebarOpen, setClubSidebarOpen] = useState(readClubPublicSidebarPref);
  const [ctsvSidebarOpen, setCtsvSidebarOpen] = useState(readCtsvSidebarPref);
  const [clubEvents, setClubEvents] = useState([]);
  const [lastSeenNotifs, setLastSeenNotifs] = useState(() =>
    parseInt(localStorage.getItem('clb_last_seen_notifs') || '0', 10)
  );

  useEffect(() => {
    if (!showClubShell) return;
    fetch(`${API_BASE}/api/events/my`, { headers: getEventHeaders(false) })
      .then((res) => parseApiResponse(res))
      .then(({ ok, data }) => {
        if (ok && data.success && Array.isArray(data.events)) {
          setClubEvents(data.events);
        }
      })
      .catch(() => {});
  }, [showClubShell, pathname]);

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
  const toggleClubSidebar = useCallback(() => {
    setClubSidebarOpen((prev) => {
      const next = !prev;
      persistClubPublicSidebarOpen(next);
      return next;
    });
  }, []);
  const closeClubSidebar = useCallback(() => {
    setClubSidebarOpen(false);
    persistClubPublicSidebarOpen(false);
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

  if (!showAdminMenu && !showClubShell && !showCtsvShell) {
    return (
      <>
        <SiteHeader {...headerProps} />
        {children}
      </>
    );
  }

  if (showClubShell) {
    const shellClass = `ctsv-app-shell club-app-shell club-public-shell${
      clubSidebarOpen ? ' sidebar-open' : ' sidebar-closed'
    }`;
    return (
      <div className={shellClass}>
        {clubSidebarOpen && (
          <button
            type="button"
            className="ctsv-drawer-backdrop"
            onClick={closeClubSidebar}
            aria-label="Đóng menu"
          />
        )}
        <ClubPublicSidebar
          open={clubSidebarOpen}
          pathname={pathname}
          userProfile={userProfile}
          onClose={closeClubSidebar}
          hasNewNotifs={hasNewClubNotifs}
          onNotificationsRead={markClubNotificationsRead}
        />
        <div className="ctsv-shell-main">
          <SiteHeader
            {...headerProps}
            onTogglePortalSidebar={toggleClubSidebar}
            portalSidebarOpen={clubSidebarOpen}
          />
          {children}
        </div>
      </div>
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
            {...headerProps}
            onTogglePortalSidebar={toggleCtsvSidebar}
            portalSidebarOpen={ctsvSidebarOpen}
          />
          {children}
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
        <AdminTopHeader {...headerProps} sidebarToggle={toggleAdminSidebar} sidebarOpen={adminSidebarOpen} />
        {children}
      </div>
    </div>
  );
};

export default PublicAdminShell;
