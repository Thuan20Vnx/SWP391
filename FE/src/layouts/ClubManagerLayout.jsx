import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import SiteHeader from '../components/SiteHeader';
import ClubSidebarAside from '../components/club/ClubSidebarAside';
import {
  isClubDesktop,
  navigateClubNavItem,
  persistClubSidebarOpen,
  readClubSidebarPref,
  resolveClubActiveNav,
} from '../components/club/clubNavConfig';
import { API_BASE, getAuthHeaders, getEventHeaders, parseApiResponse } from '../utils/api';
import { ACTIVE_CLUB_CHANGED } from '../utils/activeManagedClub';
import { resolveUserAvatar } from '../utils/image';
import '../styles/club-portal.css';

const ClubManagerLayout = ({ showToast }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [userProfile, setUserProfile] = useState({
    fullname: '',
    course: 'K18',
    picture: defaultAvatar,
    role: '',
  });
  const [sidebarOpen, setSidebarOpen] = useState(readClubSidebarPref);
  const [activeNav, setActiveNav] = useState(() => resolveClubActiveNav(pathname));
  const [events, setEvents] = useState([]);
  const [lastSeenNotifs, setLastSeenNotifs] = useState(() =>
    parseInt(localStorage.getItem('clb_last_seen_notifs') || '0', 10)
  );

  useEffect(() => {
    setActiveNav(resolveClubActiveNav(pathname));
  }, [pathname]);

  useEffect(() => {
    if (!pathname.startsWith('/quan-ly-clb') || pathname.startsWith('/quan-ly-clb/announcements')) return;
    sessionStorage.setItem('clb_active_nav', activeNav);
  }, [activeNav, pathname]);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      showToast?.('Vui lòng đăng nhập để tiếp tục!', 'error');
      navigate('/login');
      return;
    }

    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) return;
        const u = data.user;
        const role = u.role || '';
        setUserProfile({
          fullname: u.fullname || '',
          course: u.course || 'K18',
          picture: resolveUserAvatar(u, defaultAvatar),
          role,
        });
        if (role && role !== 'club_manager') {
          showToast?.('Bạn không có quyền truy cập trang quản lý CLB!', 'error');
          localStorage.setItem('userRole', role);
          navigate('/');
        }
      })
      .catch(() => {});
  }, [navigate, showToast]);

  const loadEvents = useCallback(() => {
    fetch(`${API_BASE}/api/events/my`, { headers: getEventHeaders(false) })
      .then((res) => parseApiResponse(res))
      .then(({ ok, data }) => {
        if (ok && data.success && Array.isArray(data.events)) setEvents(data.events);
      })
      .catch(() => {});
  }, [setEvents]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const handleClubChanged = () => loadEvents();
    window.addEventListener(ACTIVE_CLUB_CHANGED, handleClubChanged);
    return () => window.removeEventListener(ACTIVE_CLUB_CHANGED, handleClubChanged);
  }, [loadEvents]);

  const hasNewNotifs = useMemo(() => {
    return events
      .filter((ev) => ev.status && ev.status !== 'draft')
      .some((ev) => {
        const raw = new Date(ev.updatedAt || ev.createdAt || 0).getTime();
        return raw > lastSeenNotifs;
      });
  }, [events, lastSeenNotifs]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      persistClubSidebarOpen(next);
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    persistClubSidebarOpen(false);
  }, []);

  const markNotificationsRead = useCallback(() => {
    const now = Date.now();
    setLastSeenNotifs(now);
    localStorage.setItem('clb_last_seen_notifs', now.toString());
  }, []);

  const handleNavSelect = useCallback(
    (key) => {
      if (key === 'announcements') {
        setActiveNav('announcements');
      } else {
        setActiveNav(key);
      }

      navigateClubNavItem({
        key,
        navigate,
        pathname,
        onNotificationsRead: key === 'notifications' ? markNotificationsRead : undefined,
      });
    },
    [markNotificationsRead, navigate, pathname]
  );

  const shellClass = `ctsv-app-shell club-app-shell${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`;

  return (
    <div className={shellClass}>
      {!isClubDesktop() && sidebarOpen && (
        <button type="button" className="ctsv-drawer-backdrop" onClick={closeSidebar} aria-label="Đóng menu" />
      )}

      <ClubSidebarAside
        sidebarOpen={sidebarOpen}
        onClose={closeSidebar}
        userProfile={userProfile}
        activeNav={activeNav}
        onNavSelect={handleNavSelect}
        hasNewNotifs={hasNewNotifs}
      />

      <div className="ctsv-shell-main">
        <div className="clb-page">
          <SiteHeader
            activeNav="club-manage"
            onTogglePortalSidebar={toggleSidebar}
            portalSidebarOpen={sidebarOpen}
          />
          <main className="clb-main">
            <Outlet
              context={{
                showToast,
                userProfile,
                activeNav,
                setActiveNav,
                events,
                setEvents,
                lastSeenNotifs,
                setLastSeenNotifs,
              }}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default ClubManagerLayout;
