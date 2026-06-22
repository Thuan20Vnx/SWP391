import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import SiteHeader from '../components/SiteHeader';
import ClubSidebarAside from '../components/club/ClubSidebarAside';
import ChatbotFloating from '../components/ChatbotFloating';
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
import '../styles/club-mobile.css';

const ClubManagerLayout = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
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
    // Khi điều hướng kèm state.editEventId (vd: bấm "Chỉnh sửa thông tin" từ
    // trang chi tiết quản lý), để ClubManagement tự mở form sửa — không để
    // effect này ghi đè activeNav về 'list' theo pathname.
    //
    // Chỉ phụ thuộc [pathname]: ClubManagement sẽ tự "dọn" state.editEventId
    // bằng một navigate(..., {replace:true, state:{}}) ngay sau khi đọc —
    // nếu editEventId nằm trong dependency array, lần dọn đó sẽ kích hoạt
    // lại effect này (state đổi dù pathname không đổi) và ghi đè activeNav
    // về 'list' ngay sau khi ClubManagement vừa set 'create'.
    if (location.state?.editEventId) return;
    setActiveNav(resolveClubActiveNav(pathname));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const closeSidebarOnMobile = () => {
      if (window.innerWidth > 900) return;
      setSidebarOpen(false);
      persistClubSidebarOpen(false);
    };

    closeSidebarOnMobile();
    window.addEventListener('resize', closeSidebarOnMobile);
    return () => window.removeEventListener('resize', closeSidebarOnMobile);
  }, []);

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
      <ChatbotFloating context="club_manager" />
    </div>
  );
};

export default ClubManagerLayout;
