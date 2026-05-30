import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Outlet, useNavigate, useLocation } from 'react-router-dom';

import defaultAvatar from '../constants/defaultAvatar';

import CtsvPortalHeader from '../components/ctsv/CtsvPortalHeader';

import CtsvPortalFooter from '../components/ctsv/CtsvPortalFooter';

import CtsvSidebarAside from '../components/ctsv/CtsvSidebarAside';

import {

  isCtsvDesktop,

  persistSidebarOpen,

  readSidebarPref

} from '../components/ctsv/ctsvNavConfig';

import { API_BASE, getAuthHeaders } from '../utils/api';

import { getUserRole, isCtsvRole, normalizeRole } from '../utils/auth';

import { logoutWithConfirm } from '../utils/logout';
import { AUTH_CHANGED_EVENT } from '../utils/authEvents';
import { resolveUserAvatar } from '../utils/image';



const CtsvLayout = ({ showToast }) => {

  const navigate = useNavigate();

  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(readSidebarPref);

  const [headerSearch, setHeaderSearch] = useState('');

  const headerSearchSubmitRef = useRef(null);

  const [userProfile, setUserProfile] = useState({

    fullname: localStorage.getItem('userFullname') || 'Cán bộ CTSV',

    picture: defaultAvatar

  });



  const loadCtsvUserProfile = useCallback(() => {
    if (!isCtsvRole()) {
      navigate('/', { replace: true });
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) return;
    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then((res) => (res.status === 200 ? res.json() : Promise.reject()))
      .then((data) => {
        const role = normalizeRole(data.user?.role);
        if (!isCtsvRole(role)) {
          navigate('/', { replace: true });
          return;
        }
        localStorage.setItem('userRole', role);
        if (data.user?.fullname) {
          localStorage.setItem('userFullname', data.user.fullname);
        }
        setUserProfile({
          fullname: data.user.fullname || 'Cán bộ CTSV',
          picture: resolveUserAvatar(data.user, defaultAvatar)
        });
      })
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    loadCtsvUserProfile();
  }, [loadCtsvUserProfile]);

  useEffect(() => {
    const onAuthChanged = () => loadCtsvUserProfile();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [loadCtsvUserProfile]);



  const toggleSidebar = useCallback(() => {

    setSidebarOpen((prev) => {

      const next = !prev;

      persistSidebarOpen(next);

      return next;

    });

  }, []);



  const closeSidebar = useCallback(() => {

    setSidebarOpen(false);

    persistSidebarOpen(false);

  }, []);



  const handleLogout = () => {

    logoutWithConfirm(navigate, {

      showToast,

      toastMessage: 'Đã đăng xuất tài khoản CTSV.'

    });

  };



  const shellClass = `ctsv-app-shell${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`;



  return (

    <div className={shellClass}>

      {!isCtsvDesktop() && sidebarOpen && (

        <button

          type="button"

          className="ctsv-drawer-backdrop"

          onClick={closeSidebar}

          aria-label="Đóng menu"

        />

      )}



      <CtsvSidebarAside

        sidebarOpen={sidebarOpen}

        onClose={closeSidebar}

        userProfile={userProfile}

        onLogout={handleLogout}

        pathname={location.pathname}

      />



      <div className="ctsv-shell-main ctsv-portal-shell">

        <div className="home-layout ctsv-home-layout ctsv-portal-layout">

          <CtsvPortalHeader

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

                navigate('/ctsv/events');

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



          <CtsvPortalFooter />

        </div>

      </div>

    </div>

  );

};



export default CtsvLayout;

