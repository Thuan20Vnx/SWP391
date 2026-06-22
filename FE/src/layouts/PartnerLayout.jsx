import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import PartnerPortalHeader from '../components/partner/PartnerPortalHeader';
import PartnerPortalFooter from '../components/partner/PartnerPortalFooter';
import PartnerSidebarAside from '../components/partner/PartnerSidebarAside';
import {
  isPartnerDesktop,
  persistPartnerSidebarOpen,
  readPartnerSidebarPref
} from '../components/partner/partnerNavConfig';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { isPartnerRole, normalizeRole } from '../utils/auth';
import { logoutWithConfirm } from '../utils/logout';
import { AUTH_CHANGED_EVENT } from '../utils/authEvents';
import { resolveUserAvatar } from '../utils/image';
import ChatbotFloating from '../components/ChatbotFloating';
import '../styles/partner-portal.css';

const PartnerLayout = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(readPartnerSidebarPref);
  const [headerSearch, setHeaderSearch] = useState('');
  const headerSearchSubmitRef = useRef(null);
  const [userProfile, setUserProfile] = useState({
    fullname: localStorage.getItem('userFullname') || 'Đối tác FPT',
    picture: defaultAvatar
  });

  const loadUserProfile = useCallback(() => {
    if (!isPartnerRole()) {
      navigate('/', { replace: true });
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) return;
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.status === 200 ? res.json() : Promise.reject()))
      .then((data) => {
        const role = normalizeRole(data.user?.role);
        if (!isPartnerRole(role)) {
          navigate('/', { replace: true });
          return;
        }
        localStorage.setItem('userRole', role);
        if (data.user?.fullname) {
          localStorage.setItem('userFullname', data.user.fullname);
        }
        setUserProfile({
          fullname: data.user.fullname || 'Đối tác FPT',
          picture: resolveUserAvatar(data.user, defaultAvatar)
        });
      })
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    const onAuthChanged = () => loadUserProfile();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [loadUserProfile]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      persistPartnerSidebarOpen(next);
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    persistPartnerSidebarOpen(false);
  }, []);

  const handleLogout = () => {
    logoutWithConfirm(navigate, {
      showToast,
      toastMessage: 'Đã đăng xuất tài khoản đối tác.'
    });
  };

  const shellClass = `ctsv-app-shell partner-app-shell${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`;

  return (
    <div className={shellClass}>
      {!isPartnerDesktop() && sidebarOpen && (
        <button type="button" className="ctsv-drawer-backdrop" onClick={closeSidebar} aria-label="Đóng menu" />
      )}

      <PartnerSidebarAside
        sidebarOpen={sidebarOpen}
        onClose={closeSidebar}
        userProfile={userProfile}
        onLogout={handleLogout}
        pathname={location.pathname}
      />

      <div className="ctsv-shell-main ctsv-portal-shell">
        <div className="home-layout ctsv-home-layout ctsv-portal-layout">
          <PartnerPortalHeader
            userProfile={userProfile}
            showToast={showToast}
            onToggleSidebar={toggleSidebar}
            sidebarOpen={sidebarOpen}
            showSearch
            searchQuery={headerSearch}
            onSearchChange={setHeaderSearch}
            onSearchSubmit={(queryOverride) => {
              if (typeof queryOverride === 'string') {
                setHeaderSearch(queryOverride);
              }
              if (headerSearchSubmitRef.current) {
                headerSearchSubmitRef.current(queryOverride);
              } else {
                navigate('/partner/events');
              }
            }}
          />

          <div className={`ctsv-portal-body${location.pathname === '/partner' ? '' : ' partner-portal-inner'}`}>
            <Outlet
              context={{
                showToast,
                userProfile,
                toggleSidebar,
                headerSearch,
                setHeaderSearch,
                registerHeaderSearchSubmit: (fn) => {
                  headerSearchSubmitRef.current = fn;
                }
              }}
            />
          </div>

          <PartnerPortalFooter />
        </div>
      </div>
      <ChatbotFloating context="partner" />
    </div>
  );
};

export default PartnerLayout;
