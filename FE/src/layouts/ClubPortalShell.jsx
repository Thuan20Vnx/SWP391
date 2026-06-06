import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import SiteHeader from '../components/SiteHeader';
import ClubSidebarAside from '../components/club/ClubSidebarAside';
import {
  CLUB_NAV_ITEMS,
  isClubDesktop,
  persistClubSidebarOpen,
  readClubSidebarPref,
} from '../components/club/clubNavConfig';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { resolveUserAvatar } from '../utils/image';
import '../styles/club-portal.css';

const ClubPortalShell = ({ activeNav, children, showToast, hasNewNotifs = false }) => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    fullname: '',
    course: 'K18',
    picture: defaultAvatar,
    role: '',
  });
  const [sidebarOpen, setSidebarOpen] = useState(readClubSidebarPref);

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

  const handleNavSelect = useCallback((key) => {
    const item = CLUB_NAV_ITEMS.find((nav) => nav.key === key);
    if (item?.external) {
      if (key !== activeNav) navigate(item.external);
      return;
    }
    sessionStorage.setItem('clb_active_nav', key);
    navigate('/quan-ly-clb');
  }, [activeNav, navigate]);

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
          <main className="clb-main">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default ClubPortalShell;
