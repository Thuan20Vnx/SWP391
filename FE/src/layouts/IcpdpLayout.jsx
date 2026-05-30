import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import IcpdpPortalHeader from '../components/icpdp/IcpdpPortalHeader';
import IcpdpPortalFooter from '../components/icpdp/IcpdpPortalFooter';
import IcpdpSidebarAside from '../components/icpdp/IcpdpSidebarAside';
import {
  isIcpdpDesktop,
  persistIcpdpSidebarOpen,
  readIcpdpSidebarPref
} from '../components/icpdp/icpdpNavConfig';
import { API_BASE, getAuthHeaders } from '../utils/api';
import { getUserRole, isIcpdpRole, normalizeRole } from '../utils/auth';
import { logoutWithConfirm } from '../utils/logout';
import { AUTH_CHANGED_EVENT } from '../utils/authEvents';
import { resolveUserAvatar } from '../utils/image';

const IcpdpLayout = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(readIcpdpSidebarPref);
  const [headerSearch, setHeaderSearch] = useState('');
  const headerSearchSubmitRef = useRef(null);
  const [userProfile, setUserProfile] = useState({
    fullname: localStorage.getItem('userFullname') || 'Cán bộ IC-PDP',
    picture: defaultAvatar
  });

  const loadUserProfile = useCallback(() => {
    if (!isIcpdpRole()) {
      navigate('/', { replace: true });
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) return;
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.status === 200 ? res.json() : Promise.reject()))
      .then((data) => {
        const role = normalizeRole(data.user?.role);
        if (!isIcpdpRole(role)) {
          navigate('/', { replace: true });
          return;
        }
        localStorage.setItem('userRole', role);
        if (data.user?.fullname) {
          localStorage.setItem('userFullname', data.user.fullname);
        }
        setUserProfile({
          fullname: data.user.fullname || 'Cán bộ IC-PDP',
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
      persistIcpdpSidebarOpen(next);
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    persistIcpdpSidebarOpen(false);
  }, []);

  const handleLogout = () => {
    logoutWithConfirm(navigate, {
      showToast,
      toastMessage: 'Đã đăng xuất tài khoản IC-PDP.'
    });
  };

  const shellClass = `ctsv-app-shell icpdp-app-shell${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`;

  return (
    <div className={shellClass}>
      {!isIcpdpDesktop() && sidebarOpen && (
        <button
          type="button"
          className="ctsv-drawer-backdrop"
          onClick={closeSidebar}
          aria-label="Đóng menu"
        />
      )}

      <IcpdpSidebarAside
        sidebarOpen={sidebarOpen}
        onClose={closeSidebar}
        userProfile={userProfile}
        onLogout={handleLogout}
        pathname={location.pathname}
      />

      <div className="ctsv-shell-main ctsv-portal-shell">
        <div className="home-layout ctsv-home-layout ctsv-portal-layout">
          <IcpdpPortalHeader
            userProfile={userProfile}
            showToast={showToast}
            onToggleSidebar={toggleSidebar}
            sidebarOpen={sidebarOpen}
            showSearch
            searchQuery={headerSearch}
            onSearchChange={setHeaderSearch}
            onSearchSubmit={() => {
              if (headerSearchSubmitRef.current) {
                headerSearchSubmitRef.current();
              } else {
                navigate('/icpdp/proposals');
              }
            }}
          />

          <div className="ctsv-portal-body">
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

          <IcpdpPortalFooter />
        </div>
      </div>
    </div>
  );
};

export default IcpdpLayout;
